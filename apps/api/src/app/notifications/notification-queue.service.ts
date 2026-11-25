import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import pLimit from 'p-limit';
import { TokenBucketRateLimiterService } from '../../common/services/token-bucket-rate-limiter.service';
import { NotificationLane } from './notification-lane.enum';
import { NotificationJobContext } from './notification-queue.types';

const DRAIN_POLL_INTERVAL_MS = 50;
const STATS_LOG_INTERVAL_MS = 60_000;

@Injectable()
export class NotificationQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private readonly limit: ReturnType<typeof pLimit>;
  private readonly retryLimit: ReturnType<typeof pLimit>;
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
    this.retryLimit = pLimit(workerCount);
  }

  public enqueue(task: () => Promise<void>, context: NotificationJobContext): boolean {
    if (this.isStopping) {
      this.droppedCount++;
      this.logger.warn(
        `[NOTIFICATION_QUEUE] Dropping notification ${context.label} for VIN ${context.vin} - shutdown in progress`
      );
      return false;
    }

    if (this.getQueuedJobCount() >= this.maxQueueSize) {
      this.droppedCount++;
      this.logger.error(
        `[NOTIFICATION_QUEUE] Queue full (${this.maxQueueSize} jobs), dropping notification ${context.label} for VIN ${context.vin}`
      );
      return false;
    }

    this.trackAlertEventId(context);

    void this.limiterFor(context)(() => this.executeTask(task, context))
      .catch((error: unknown) => {
        this.logger.error(
          `[NOTIFICATION_QUEUE] Unhandled error for ${context.label}:`,
          error instanceof Error ? error.message : String(error)
        );
      })
      .finally(() => {
        this.releaseAlertEventId(context);
      });

    return true;
  }

  public has(alertEventId: string): boolean {
    return this.queuedAlertEventIds.has(alertEventId);
  }

  public countFreeRetrySlots(maxRetryBacklog: number): number {
    if (this.isStopping) {
      return 0;
    }

    const freeQueueSlots = this.maxQueueSize - this.getQueuedJobCount();
    return Math.max(Math.min(maxRetryBacklog - this.countRetryJobs(), freeQueueSlots), 0);
  }

  public async waitForRetryLaneIdle(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    while (this.countRetryJobs() > 0 && !this.isStopping && Date.now() < deadline) {
      await this.sleep(Math.min(DRAIN_POLL_INTERVAL_MS, deadline - Date.now()));
    }
  }

  public async drain(timeoutMs: number): Promise<void> {
    this.isStopping = true;

    const deadline = Date.now() + timeoutMs;

    while (this.getQueuedJobCount() > 0 && Date.now() < deadline) {
      await this.sleep(Math.min(DRAIN_POLL_INTERVAL_MS, deadline - Date.now()));
    }

    if (this.getQueuedJobCount() > 0) {
      this.logger.warn(
        `[NOTIFICATION_QUEUE] Drain timed out after ${timeoutMs}ms with ${this.limit.pendingCount + this.retryLimit.pendingCount} pending and ${this.limit.activeCount + this.retryLimit.activeCount} active job(s)`
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

  private limiterFor(context: NotificationJobContext): ReturnType<typeof pLimit> {
    return context.lane === NotificationLane.Retry ? this.retryLimit : this.limit;
  }

  private countRetryJobs(): number {
    return this.retryLimit.pendingCount + this.retryLimit.activeCount;
  }

  private getQueuedJobCount(): number {
    return this.limit.pendingCount + this.limit.activeCount + this.countRetryJobs();
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
