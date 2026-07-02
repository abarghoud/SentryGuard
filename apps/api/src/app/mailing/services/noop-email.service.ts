import { Injectable, Logger } from '@nestjs/common';
import type { EmailServiceRequirements } from '../interfaces/email-service.requirements';

@Injectable()
export class NoopEmailService implements EmailServiceRequirements {
  private readonly logger = new Logger(NoopEmailService.name);

  public async sendTemplateEmail(
    to: string,
    templateKey: string,
    mergeInfo: Record<string, string>
  ): Promise<void> {
    this.logger.warn(
      `Email sending is disabled. Mock call details: to=${to}, templateKey=${templateKey}, mergeInfo=${JSON.stringify(mergeInfo)}`
    );
  }
}
