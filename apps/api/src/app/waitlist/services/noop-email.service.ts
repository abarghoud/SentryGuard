import { Injectable, Logger } from '@nestjs/common';
import type { EmailServiceRequirements } from '../interfaces/email-service.requirements';

@Injectable()
export class NoopEmailService implements EmailServiceRequirements {
  private readonly logger = new Logger(NoopEmailService.name);

  public async sendEmail(): Promise<void> {
    this.logger.warn(
      'Email sending is disabled (ZEPTOMAIL_API_KEY not configured)'
    );
  }
}