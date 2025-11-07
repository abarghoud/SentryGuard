import { Injectable, Logger } from '@nestjs/common';
import i18n from '../../i18n';
import { TelegramBotService } from './telegram-bot.service';
import { UserLanguageService } from '../user/user-language.service';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly telegramBotService: TelegramBotService,
    private readonly userLanguageService: UserLanguageService
  ) {}

  async sendSentryAlert(userId: string, alertInfo: { vin: string, display_name?: string }) {
    try {
      const userLanguage = await this.userLanguageService.getUserLanguage(
        userId
      );
      const message = this.formatSentryAlertMessage(alertInfo, userLanguage);
      const success = await this.telegramBotService.sendMessageToUser(
        userId,
        message
      );

      if (success) {
        this.logger.log(`📱 Alerte Sentry envoyée à l'utilisateur: ${userId}`);
      } else {
        this.logger.warn(
          `⚠️ Impossible d'envoyer l'alerte à l'utilisateur: ${userId}`
        );
      }

      return success;
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de l'envoi de l'alerte Sentry à ${userId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Envoie un message Telegram personnalisé à un utilisateur
   */
  async sendTelegramMessage(userId: string, message: string) {
    try {
      const success = await this.telegramBotService.sendMessageToUser(
        userId,
        message
      );

      if (success) {
        this.logger.log(
          `📱 Message Telegram envoyé à l'utilisateur: ${userId}`
        );
      } else {
        this.logger.warn(
          `⚠️ Impossible d'envoyer le message à l'utilisateur: ${userId}`
        );
      }

      return success;
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de l'envoi du message Telegram à ${userId}:`,
        error
      );
      return false;
    }
  }

  private formatSentryAlertMessage(
    { display_name, vin }: { vin: string, display_name?: string },
    lng: 'en' | 'fr'
  ): string {
    return `
🚨 <b>${i18n.t('TESLA SENTRY ALERT', { lng })}</b> 🚨

🚗 <b>${i18n.t('Vehicle', { lng })}:</b> ${display_name ? `${display_name} (${vin})`: vin} 

<i>${i18n.t('Sentry Mode activated - Check your vehicle!', { lng })}</i>
    `.trim();
  }
}
