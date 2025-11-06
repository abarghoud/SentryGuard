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

  async sendSentryAlert(userId: string, alertInfo: any) {
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
    alertInfo: any,
    lng: 'en' | 'fr'
  ): string {
    const timestamp = new Date(alertInfo.timestamp).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return `
🚨 <b>${i18n.t('TESLA SENTRY ALERT', { lng })}</b> 🚨

🚗 <b>${i18n.t('Vehicle', { lng })}:</b> ${alertInfo.vin}
⏰ <b>${i18n.t('Time', { lng })}:</b> ${timestamp}
📍 <b>${i18n.t('Location', { lng })}:</b> ${
      alertInfo.location || i18n.t('Not available', { lng })
    }
🔋 <b>${i18n.t('Battery', { lng })}:</b> ${alertInfo.batteryLevel || i18n.t('N/A', { lng })}%
🚗 <b>${i18n.t('Speed', { lng })}:</b> ${alertInfo.vehicleSpeed || '0'} km/h
🔔 <b>${i18n.t('Sentry Mode', { lng })}:</b> ${alertInfo.sentryMode || 'Aware'}
📱 <b>${i18n.t('Display', { lng })}:</b> ${alertInfo.centerDisplay || 'Unknown'}
🚨 <b>${i18n.t('Alarm State', { lng })}:</b> ${alertInfo.alarmState || 'Active'}

<i>${i18n.t('Sentry Mode activated - Check your vehicle!', { lng })}</i>
    `.trim();
  }
}
