import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  TeslaTokenRefreshService,
  RefreshResult,
} from './tesla-token-refresh.service';
import { DistributedLockService } from '../../../common/services/distributed-lock.service';
import { TESLA_TOKEN_REFRESH_CRON_EXPRESSION } from '../../../config/tesla-token-refresh-cron.config';
import { SchedulerLockKey } from '../../../config/scheduler-lock-key.config';

const RATE_LIMIT_DELAY_MILLISECONDS = 100;
const BATCH_THRESHOLD = 10;

@Injectable()
export class TeslaTokenRefreshSchedulerService {
  private readonly logger = new Logger(
    TeslaTokenRefreshSchedulerService.name
  );

  constructor(
    private readonly teslaTokenRefreshService: TeslaTokenRefreshService,
    private readonly distributedLockService: DistributedLockService
  ) {}

  @Cron(TESLA_TOKEN_REFRESH_CRON_EXPRESSION)
  public async refreshExpiringTokens(): Promise<void> {
    const wasExecuted = await this.distributedLockService.withLock(
      SchedulerLockKey.TeslaTokenRefresh,
      () => this.executeRefreshCycle()
    );

    if (!wasExecuted) {
      this.logger.warn('Previous refresh cycle still running, skipping');
    }
  }

  private async executeRefreshCycle(): Promise<void> {
    this.logger.log('Starting refresh token renewal cycle...');

    const users = await this.teslaTokenRefreshService.findUsersWithExpiringRefreshTokens();

    if (users.length === 0) {
      this.logger.log('No users with expiring refresh tokens found');
      return;
    }

    this.logger.log(`Found ${users.length} users with expiring refresh tokens`);

    const shouldDelay = users.length > BATCH_THRESHOLD;
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      const result = await this.refreshTokenSafely(user.userId);

      if (result === RefreshResult.Success) {
        successCount++;
      } else if (
        result === RefreshResult.AuthenticationExpired ||
        result === RefreshResult.AlreadyRefreshed
      ) {
        skippedCount++;
      } else {
        failureCount++;
      }

      if (shouldDelay) {
        await this.delay(RATE_LIMIT_DELAY_MILLISECONDS);
      }
    }

    this.logger.log(
      `Token refresh cycle complete: ${successCount} refreshed, ${skippedCount} skipped, ${failureCount} failed`
    );
  }

  private async refreshTokenSafely(userId: string): Promise<RefreshResult> {
    try {
      return await this.teslaTokenRefreshService.refreshTokenForUser(userId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Unexpected error refreshing token for user ${userId}: ${errorMessage}`
      );
      return RefreshResult.TransientFailure;
    }
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
