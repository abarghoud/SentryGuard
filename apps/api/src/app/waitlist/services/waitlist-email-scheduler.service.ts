import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WaitlistService } from './waitlist.service';
import { DistributedLockService } from '../../../common/services/distributed-lock.service';
import type { Waitlist } from '../../../entities/waitlist.entity';
import { WAITLIST_EMAIL_CRON_EXPRESSION } from '../../../config/waitlist-cron.config';
import { SchedulerLockKey } from '../../../config/scheduler-lock-key.config';

@Injectable()
export class WaitlistEmailSchedulerService {
  private readonly logger = new Logger(WaitlistEmailSchedulerService.name);

  constructor(
    private readonly waitlistService: WaitlistService,
    private readonly distributedLockService: DistributedLockService
  ) {}

  @Cron(WAITLIST_EMAIL_CRON_EXPRESSION)
  public async processApprovedUsers(): Promise<void> {
    const wasExecuted = await this.distributedLockService.withLock(
      SchedulerLockKey.WaitlistEmail,
      () => this.executeEmailCycle()
    );

    if (!wasExecuted) {
      this.logger.warn('Previous email cycle still running, skipping');
    }
  }

  private async executeEmailCycle(): Promise<void> {
    this.logger.log('Starting approved users email processing...');

    const approvedUsers =
      await this.waitlistService.findApprovedUsersForEmailSending();

    if (approvedUsers.length === 0) {
      this.logger.log('No newly approved users to process');
      return;
    }

    this.logger.log(
      `Found ${approvedUsers.length} approved users for email sending`
    );

    await this.sendWelcomeEmails(approvedUsers);
  }

  private async sendWelcomeEmails(users: Waitlist[]): Promise<void> {
    let failureCount = 0;
    let successCount = 0;

    for (const user of users) {
      const isSuccess = await this.sendEmailSafely(user);
      if (isSuccess) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    this.logger.log(
      `Welcome email processing complete: ${successCount} sent, ${failureCount} failed`
    );
  }

  private async sendEmailSafely(user: Waitlist): Promise<boolean> {
    try {
      await this.waitlistService.sendWelcomeEmailAndMarkSent(user);

      this.logger.log(`Welcome email sent successfully to ${user.email}`);
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send welcome email to ${user.email}: ${errorMessage}`
      );

      return false;
    }
  }
}
