import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Waitlist, WaitlistStatus } from '../../../entities/waitlist.entity';
import type { EmailServiceRequirements } from '../interfaces/email-service.requirements';
import { emailServiceRequirementsSymbol } from '../interfaces/email-service.requirements';
import { waitlistEmailBatchSizeToken } from '../../../config/waitlist-cron.config';
import { EmailContentBuilderService } from './email-content-builder.service';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    @InjectRepository(Waitlist)
    private readonly waitlistRepository: Repository<Waitlist>,
    @Inject(emailServiceRequirementsSymbol)
    private readonly emailService: EmailServiceRequirements,
    private readonly emailContentBuilder: EmailContentBuilderService,
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

    const content = this.emailContentBuilder.buildWelcomeEmail(
      entry.fullName,
      entry.preferredLanguage
    );

    await this.emailService.sendEmail(
      entry.email,
      content.subject,
      content.body
    );

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
