import { Injectable, Logger } from '@nestjs/common';
import type { EmailServiceRequirements } from '../interfaces/email-service.requirements';

@Injectable()
export class ZeptomailService implements EmailServiceRequirements {
  private readonly logger = new Logger(ZeptomailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly apiKey: string;

  constructor() {
    this.apiKey = this.getRequiredEnv('ZEPTOMAIL_API_KEY');
    this.fromEmail = this.getRequiredEnv('ZEPTOMAIL_FROM_EMAIL');
    this.fromName = process.env.ZEPTOMAIL_FROM_NAME || 'SentryGuard';
  }

  public async sendTemplateEmail(
    to: string,
    templateKey: string,
    mergeInfo: Record<string, string>
  ): Promise<void> {
    try {
      const response = await fetch('https://api.zeptomail.com/v1.1/email/template', {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-enczapikey ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: {
            address: this.fromEmail,
            name: this.fromName,
          },
          to: [
            {
              email_address: {
                address: to,
              },
            },
          ],
          template_key: templateKey,
          merge_info: mergeInfo,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Zeptomail API returned status ${response.status}: ${errorText}`);
      }

      this.logger.log(`Template email sent successfully to ${to} using template ${templateKey}`);
    } catch (error) {
      this.logAndRethrowError(error, to);
    }
  }

  private logAndRethrowError(error: unknown, email: string): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`Failed to send email to ${email}: ${errorMessage}`);
    throw error;
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`${name} environment variable is required`);
    }
    return value;
  }
}
