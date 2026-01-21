import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WaitlistService } from './waitlist.service';
import type { Waitlist } from '../../../entities/waitlist.entity';
import { WAITLIST_EMAIL_CRON_EXPRESSION } from '../../../config/waitlist-cron.config';

@Injectable()
export class WaitlistEmailSchedulerService {
  private readonly logger = new Logger(WaitlistEmailSchedulerService.name);

  constructor(private readonly waitlistService: WaitlistService) {}

  @Cron(WAITLIST_EMAIL_CRON_EXPRESSION)
  public async processApprovedUsers(): Promise<void> {
    this.logger.log('Starting approved users email processing...');

    const approvedUsers =
      await this.waitlistService.getApprovedUsersWithoutWelcomeEmail();

    if (approvedUsers.length === 0) {
      this.logger.log('No newly approved users to process');
      return;
    }

    this.logger.log(
      `Found ${approvedUsers.length} approved users without welcome email`
    );

    await this.sendWelcomeEmails(approvedUsers);
  }

  private async sendWelcomeEmails(users: Waitlist[]): Promise<void> {
    let failureCount = 0;
    let successCount = 0;

    for (const user of users) {
      const isSuccess = await this.sendWelcomeEmailSafely(user);
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

  private async sendWelcomeEmailSafely(user: Waitlist): Promise<boolean> {
    try {
      await this.waitlistService.sendWelcomeEmailAndMarkSent(user);
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
