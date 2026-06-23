import { Module } from '@nestjs/common';
import { emailServiceRequirementsSymbol } from './interfaces/email-service.requirements';
import { ZeptomailService } from './services/zeptomail.service';
import { NoopEmailService } from './services/noop-email.service';
import { MailingService } from './services/mailing.service';

const isEmailEnabled = !!process.env.ZEPTOMAIL_API_KEY;

@Module({
  providers: [
    {
      provide: emailServiceRequirementsSymbol,
      useClass: isEmailEnabled ? ZeptomailService : NoopEmailService,
    },
    MailingService,
  ],
  exports: [emailServiceRequirementsSymbol, MailingService],
})
export class MailingModule {}
