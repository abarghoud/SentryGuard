import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { EmailServiceRequirements } from '../interfaces/email-service.requirements';

@Injectable()
export class ZeptomailService implements EmailServiceRequirements {
  private readonly logger = new Logger(ZeptomailService.name);
  private readonly transporter: Transporter;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor() {
    const apiKey = this.getRequiredEnv('ZEPTOMAIL_API_KEY');
    this.fromEmail = this.getRequiredEnv('ZEPTOMAIL_FROM_EMAIL');
    this.fromName = process.env.ZEPTOMAIL_FROM_NAME || 'SentryGuard';

    this.transporter = this.createTransporter(apiKey);
  }

  public async sendEmail(
    to: string,
    subject: string,
    htmlBody: string
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: to,
        subject: subject,
        html: htmlBody,
      });

      this.logger.log(`Email sent to: ${to}`);
    } catch (error) {
      this.logAndRethrowError(error, to);
    }
  }

  private createTransporter(apiKey: string): Transporter {
    return nodemailer.createTransport({
      host: 'smtp.zeptomail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'emailapikey',
        pass: apiKey,
      },
    });
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
