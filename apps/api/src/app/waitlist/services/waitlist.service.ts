import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Waitlist, WaitlistStatus } from '../../../entities/waitlist.entity';
import { MailingService } from '../../mailing/services/mailing.service';
import type { WaitlistServiceRequirements } from '../interfaces/waitlist-service.requirements';
import { waitlistEmailBatchSizeToken } from '../../../config/waitlist-cron.config';

@Injectable()
export class WaitlistService implements WaitlistServiceRequirements {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    @InjectRepository(Waitlist)
    private readonly waitlistRepository: Repository<Waitlist>,
    private readonly mailingService: MailingService,
    @Inject(waitlistEmailBatchSizeToken)
    private readonly emailBatchSize: number
  ) {}

  public async addToWaitlist(
    email: string,
    fullName: string | undefined,
    preferredLanguage: string
  ): Promise<void> {
    const existingEntry = await this.findByEmail(email);

    if (existingEntry) {
      return;
    }

    await this.createWaitlistEntry(email, fullName, preferredLanguage);

    await this.mailingService.sendWaitlistConfirmationEmail(email, preferredLanguage, {
      name: fullName || '',
    }).catch((error) => {
      this.logger.error(`Failed to send waitlist confirmation email to ${email}: ${error.message}`);
    });
  }

  public async isApproved(email: string): Promise<boolean> {
    const entry = await this.findByEmail(email);
    return entry?.status === WaitlistStatus.Approved;
  }

  public async findApprovedUsersForEmailSending(): Promise<Waitlist[]> {
    return this.waitlistRepository.find({
      where: {
        status: WaitlistStatus.Approved,
        approvedAt: Not(IsNull()),
        welcomeEmailSentAt: IsNull(),
      },
      take: this.emailBatchSize,
    });
  }

  public async sendWelcomeEmailAndMarkSent(entry: Waitlist): Promise<void> {
    this.logger.log(
      `Starting to send welcome email to ${entry.email} (entry: ${entry.id})`
    );

    await this.mailingService.sendWelcomeEmail(entry.email, entry.preferredLanguage, {
      name: entry.fullName || '',
    });

    this.logger.log(
      `Welcome email sent successfully to ${entry.email} (entry: ${entry.id})`
    );

    await this.markWelcomeEmailSent(entry.id);

    this.logger.log(
      `Welcome email marked as sent for ${entry.email} (entry: ${entry.id})`
    );
  }

  private async findByEmail(email: string): Promise<Waitlist | null> {
    return this.waitlistRepository.findOne({ where: { email } });
  }

  private async createWaitlistEntry(
    email: string,
    fullName: string | undefined,
    preferredLanguage: string
  ): Promise<Waitlist> {
    const newEntry = this.waitlistRepository.create({
      email,
      fullName,
      preferredLanguage,
      status: WaitlistStatus.Pending,
    });

    const savedEntry = await this.waitlistRepository.save(newEntry);
    this.logger.log(`New user added to waitlist: ${email}`);

    return savedEntry;
  }

  private async markWelcomeEmailSent(id: string): Promise<void> {
    await this.waitlistRepository.update(id, {
      welcomeEmailSentAt: new Date(),
    });
    this.logger.log(`Welcome email marked as sent for waitlist entry: ${id}`);
  }
}
