import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Waitlist } from '../../entities/waitlist.entity';
import { WaitlistService } from './services/waitlist.service';
import { NoopWaitlistService } from './services/noop-waitlist.service';
import { ZeptomailService } from './services/zeptomail.service';
import { NoopEmailService } from './services/noop-email.service';
import { EmailContentBuilderService } from './services/email-content-builder.service';
import { WaitlistEmailSchedulerService } from './services/waitlist-email-scheduler.service';
import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { emailServiceRequirementsSymbol } from './interfaces/email-service.requirements';
import { waitlistServiceRequirementsSymbol } from './interfaces/waitlist-service.requirements';
import {
  WAITLIST_EMAIL_BATCH_SIZE,
  waitlistEmailBatchSizeToken,
} from '../../config/waitlist-cron.config';

const isWaitlistEnabled =
  (process.env.WAITLIST_ENABLED || 'false').toLowerCase() === 'true';
const isEmailEnabled = isWaitlistEnabled && !!process.env.ZEPTOMAIL_API_KEY;

const waitlistProviders = isWaitlistEnabled
  ? [
      WaitlistService,
      WaitlistEmailSchedulerService,
      EmailContentBuilderService,
      DistributedLockService,
      {
        provide: emailServiceRequirementsSymbol,
        useClass: isEmailEnabled ? ZeptomailService : NoopEmailService,
      },
      {
        provide: waitlistEmailBatchSizeToken,
        useValue: WAITLIST_EMAIL_BATCH_SIZE,
      },
      {
        provide: waitlistServiceRequirementsSymbol,
        useExisting: WaitlistService,
      },
    ]
  : [
      {
        provide: waitlistServiceRequirementsSymbol,
        useClass: NoopWaitlistService,
      },
    ];

const waitlistImports = isWaitlistEnabled
  ? [TypeOrmModule.forFeature([Waitlist])]
  : [];

@Module({
  imports: [...waitlistImports],
  providers: [...waitlistProviders],
  exports: [waitlistServiceRequirementsSymbol],
})
export class WaitlistModule {}
