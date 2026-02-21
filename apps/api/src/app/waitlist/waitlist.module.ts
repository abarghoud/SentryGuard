import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Waitlist } from '../../entities/waitlist.entity';
import { WaitlistService } from './services/waitlist.service';
import { ZeptomailService } from './services/zeptomail.service';
import { EmailContentBuilderService } from './services/email-content-builder.service';
import { WaitlistEmailSchedulerService } from './services/waitlist-email-scheduler.service';
import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { emailServiceRequirementsSymbol } from './interfaces/email-service.requirements';
import {
  WAITLIST_EMAIL_BATCH_SIZE,
  waitlistEmailBatchSizeToken,
} from '../../config/waitlist-cron.config';

@Module({
  imports: [TypeOrmModule.forFeature([Waitlist])],
  providers: [
    WaitlistService,
    WaitlistEmailSchedulerService,
    EmailContentBuilderService,
    DistributedLockService,
    {
      provide: emailServiceRequirementsSymbol,
      useClass: ZeptomailService,
    },
    {
      provide: waitlistEmailBatchSizeToken,
      useValue: WAITLIST_EMAIL_BATCH_SIZE,
    },
  ],
  exports: [WaitlistService],
})
export class WaitlistModule {}
