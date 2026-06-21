import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Waitlist } from '../../entities/waitlist.entity';
import { WaitlistService } from './services/waitlist.service';
import { NoopWaitlistService } from './services/noop-waitlist.service';
import { WaitlistEmailSchedulerService } from './services/waitlist-email-scheduler.service';
import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { MailingModule } from '../mailing/mailing.module';
import { waitlistServiceRequirementsSymbol } from './interfaces/waitlist-service.requirements';
import {
  WAITLIST_EMAIL_BATCH_SIZE,
  waitlistEmailBatchSizeToken,
} from '../../config/waitlist-cron.config';

const isWaitlistEnabled =
  (process.env.WAITLIST_ENABLED || 'false').toLowerCase() === 'true';

const waitlistProviders = isWaitlistEnabled
  ? [
      WaitlistService,
      WaitlistEmailSchedulerService,
      DistributedLockService,
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
  ? [TypeOrmModule.forFeature([Waitlist]), MailingModule]
  : [];

@Module({
  imports: [...waitlistImports],
  providers: [...waitlistProviders],
  exports: [waitlistServiceRequirementsSymbol],
})
export class WaitlistModule {}

