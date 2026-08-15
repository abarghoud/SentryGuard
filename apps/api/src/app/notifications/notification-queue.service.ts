import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import pLimit from 'p-limit';
import { TokenBucketRateLimiterService } from '../../common/services/token-bucket-rate-limiter.service';

export interface NotificationJobContext {
  label: string;
  vin: string;
  correlationId?: string;
  alertEventId?: string;
}

const DRAIN_POLL_INTERVAL_MS = 50;
const STATS_LOG_INTERVAL_MS = 60_000;

@Injectable()
export class NotificationQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private readonly limit: ReturnType<typeof pLimit>;
  private readonly queuedAlertEventIds = new Map<string, number>();
  private isStopping = false;
  private processedCount = 0;
  private droppedCount = 0;
  private failedCount = 0;
  private throttledMilliseconds = 0;

  constructor(
    private readonly rateLimiter: TokenBucketRateLimiterService,
    private readonly maxQueueSize: number,
    workerCount: number
  ) {
    this.limit = pLimit(workerCount);
  }

  public enqueue(task: () => Promise<void>, context: NotificationJobContext): void {
    if (this.isStopping) {
      this.droppedCount++;
      this.logger.warn(
        `[NOTIFICATION_QUEUE] Dropping notification ${context.label} for VIN ${context.vin} - shutdown in progress`
      );
      return;
    }

    if (this.getQueuedJobCount() >= this.maxQueueSize) {
      this.droppedCount++;
      this.logger.error(
        `[NOTIFICATION_QUEUE] Queue full (${this.maxQueueSize} jobs), dropping notification ${context.label} for VIN ${context.vin}`
      );
      return;
    }

    this.trackAlertEventId(context);

    void this.limit(() => this.executeTask(task, context))
      .catch((error: unknown) => {
        this.logger.error(
          `[NOTIFICATION_QUEUE] Unhandled error for ${context.label}:`,
          error instanceof Error ? error.message : String(error)
        );
      })
      .finally(() => {
        this.releaseAlertEventId(context);
      });
  }

  public has(alertEventId: string): boolean {
    return this.queuedAlertEventIds.has(alertEventId);
  }

  public async drain(timeoutMs: number): Promise<void> {
    this.isStopping = true;

    const deadline = Date.now() + timeoutMs;

    while (this.getQueuedJobCount() > 0 && Date.now() < deadline) {
      await this.sleep(Math.min(DRAIN_POLL_INTERVAL_MS, deadline - Date.now()));
    }

    if (this.getQueuedJobCount() > 0) {
      this.logger.warn(
        `[NOTIFICATION_QUEUE] Drain timed out after ${timeoutMs}ms with ${this.limit.pendingCount} pending and ${this.limit.activeCount} active job(s)`
      );
      return;
    }

    this.logger.log(
      `[NOTIFICATION_QUEUE] Queue drained (${this.processedCount} processed, ${this.droppedCount} dropped, ${this.failedCount} failed)`
    );
  }

  @Interval(STATS_LOG_INTERVAL_MS)
  public logStats(): void {
    this.logger.log(
      `[NOTIFICATION_QUEUE] Stats: processed=${this.processedCount}, dropped=${this.droppedCount}, failed=${this.failedCount}, queued=${this.getQueuedJobCount()}, throttled_ms=${this.throttledMilliseconds}`
    );

    this.processedCount = 0;
    this.droppedCount = 0;
    this.failedCount = 0;
    this.throttledMilliseconds = 0;
  }

  public onModuleDestroy(): void {
    this.isStopping = true;
  }

  private async executeTask(task: () => Promise<void>, context: NotificationJobContext): Promise<void> {
    const throttleStart = Date.now();
    await this.rateLimiter.acquire();
    this.throttledMilliseconds += Date.now() - throttleStart;

    try {
      await task();
      this.processedCount++;
    } catch (error) {
      this.failedCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[NOTIFICATION_QUEUE] Failed to execute notification ${context.label} for VIN ${context.vin}: ${errorMessage}`
      );
    }
  }

  private trackAlertEventId(context: NotificationJobContext): void {
    if (!context.alertEventId) {
      return;
    }

    const currentCount = this.queuedAlertEventIds.get(context.alertEventId) ?? 0;
    this.queuedAlertEventIds.set(context.alertEventId, currentCount + 1);
  }

  private releaseAlertEventId(context: NotificationJobContext): void {
    if (!context.alertEventId) {
      return;
    }

    const currentCount = this.queuedAlertEventIds.get(context.alertEventId) ?? 0;

    if (currentCount <= 1) {
      this.queuedAlertEventIds.delete(context.alertEventId);
      return;
    }

    this.queuedAlertEventIds.set(context.alertEventId, currentCount - 1);
  }

  private getQueuedJobCount(): number {
    return this.limit.pendingCount + this.limit.activeCount;
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
