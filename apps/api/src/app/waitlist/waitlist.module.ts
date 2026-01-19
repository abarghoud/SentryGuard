import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Waitlist } from '../../entities/waitlist.entity';
import { WaitlistService } from './services/waitlist.service';
import { ZeptomailService } from './services/zeptomail.service';
import { EmailContentBuilderService } from './services/email-content-builder.service';
import { WaitlistEmailSchedulerService } from './services/waitlist-email-scheduler.service';
import { emailServiceRequirementsSymbol } from './interfaces/email-service.requirements';

@Module({
  imports: [TypeOrmModule.forFeature([Waitlist])],
  providers: [
    WaitlistService,
    WaitlistEmailSchedulerService,
    EmailContentBuilderService,
    {
      provide: emailServiceRequirementsSymbol,
      useClass: ZeptomailService,
    },
  ],
  exports: [WaitlistService],
})
export class WaitlistModule {}
