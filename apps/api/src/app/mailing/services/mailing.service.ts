import { Injectable, Inject } from '@nestjs/common';
import { emailServiceRequirementsSymbol } from '../interfaces/email-service.requirements';
import type { EmailServiceRequirements } from '../interfaces/email-service.requirements';

@Injectable()
export class MailingService {
  constructor(
    @Inject(emailServiceRequirementsSymbol)
    private readonly emailService: EmailServiceRequirements
  ) {}

  public async sendWelcomeEmail(
    to: string,
    language: string,
    variables: { name: string }
  ): Promise<void> {
    const templateKey = language === 'fr'
      ? process.env.ZEPTOMAIL_TEMPLATE_WELCOME_FR
      : process.env.ZEPTOMAIL_TEMPLATE_WELCOME_EN;

    if (!templateKey) {
      return;
    }

    await this.emailService.sendTemplateEmail(to, templateKey, {
      name: variables.name,
      discordUrl: process.env.DISCORD_INVITE_URL || '',
    });
  }

  public async sendWaitlistConfirmationEmail(
    to: string,
    language: string,
    variables: { name: string }
  ): Promise<void> {
    const templateKey = language === 'fr'
      ? process.env.ZEPTOMAIL_TEMPLATE_WAITLIST_CONFIRM_FR
      : process.env.ZEPTOMAIL_TEMPLATE_WAITLIST_CONFIRM_EN;

    if (!templateKey) {
      return;
    }

    await this.emailService.sendTemplateEmail(to, templateKey, {
      name: variables.name,
      discordUrl: process.env.DISCORD_INVITE_URL || '',
    });
  }

  public async sendOnboardingCompleteEmail(
    to: string,
    language: string,
    variables: { name: string }
  ): Promise<void> {
    const templateKey = language === 'fr'
      ? process.env.ZEPTOMAIL_TEMPLATE_ONBOARDING_COMPLETE_FR
      : process.env.ZEPTOMAIL_TEMPLATE_ONBOARDING_COMPLETE_EN;

    if (!templateKey) {
      return;
    }

    await this.emailService.sendTemplateEmail(to, templateKey, {
      name: variables.name,
      discordUrl: process.env.DISCORD_INVITE_URL || '',
    });
  }

  public async sendTeslaDisconnectedEmail(
    to: string,
    language: string,
    variables: { name: string }
  ): Promise<void> {
    const templateKey = language === 'fr'
      ? process.env.ZEPTOMAIL_TEMPLATE_TOKEN_REVOKED_FR
      : process.env.ZEPTOMAIL_TEMPLATE_TOKEN_REVOKED_EN;

    if (!templateKey) {
      return;
    }

    const reconnectUrl = process.env.WEBAPP_URL || 'https://sentryguard.org';

    await this.emailService.sendTemplateEmail(to, templateKey, {
      name: variables.name,
      reconnectUrl,
      discordUrl: process.env.DISCORD_INVITE_URL || '',
    });
  }
}
