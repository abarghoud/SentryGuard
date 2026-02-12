import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RetryManager {
  private readonly logger = new Logger(RetryManager.name);
  private readonly backoffBase = 2;
  private pendingRetries = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly maxRetries: number,
    private readonly baseDelay: number,
    private readonly maxDelay: number,
  ) {}

  addToRetry(
    execute: () => Promise<void>,
    error: Error,
    correlationId: string,
    attemptCount = 1
  ): void {
    if (attemptCount > this.maxRetries) {
      this.logger.error(
        `[RETRY_FAILED][${correlationId}] Operation failed permanently after ${attemptCount} attempts:`,
        error.message
      );
      return;
    }

    if (attemptCount === 1) {
      this.executeRetry(execute, correlationId, attemptCount);
    } else {
      const delay = this.calculateDelay(attemptCount);

      this.logger.warn(
        `[RETRY_SCHEDULED][${correlationId}] Operation scheduled for retry ${attemptCount}/${this.maxRetries} in ${delay}ms`
      );

      const timeoutId = setTimeout(() => {
        this.pendingRetries.delete(correlationId);
        this.executeRetry(execute, correlationId, attemptCount);
      }, delay);

      this.pendingRetries.set(correlationId, timeoutId);
    }
  }

  stop(): void {
    this.clearPendingRetries();
  }

  private clearPendingRetries(): void {
    for (const timeoutId of this.pendingRetries.values()) {
      clearTimeout(timeoutId);
    }
    this.pendingRetries.clear();
    this.logger.log('Pending retries cleared');
  }

  private async executeRetry(
    execute: () => Promise<void>,
    correlationId: string,
    attemptCount: number
  ): Promise<void> {
    try {
      this.logger.log(
        `[RETRY_ATTEMPT][${correlationId}] Retrying operation (attempt ${attemptCount}/${this.maxRetries})`
      );

      await execute();

      this.logger.log(
        `[RETRY_SUCCESS][${correlationId}] Operation succeeded on retry ${attemptCount}`
      );

    } catch (error) {
      this.logger.error(
        `[RETRY_FAILED][${correlationId}] Operation failed on attempt ${attemptCount}:`,
        error instanceof Error ? error.message : String(error)
      );

      this.addToRetry(execute, error as Error, correlationId, attemptCount + 1);
    }
  }

  private calculateDelay(attemptCount: number): number {
    const backoffMultiplier = Math.pow(this.backoffBase, attemptCount - 1);

    return Math.min(
      this.baseDelay * backoffMultiplier,
      this.maxDelay
    );
  }
}