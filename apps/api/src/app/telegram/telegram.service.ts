import { Injectable, Logger } from '@nestjs/common';
import i18n from '../../i18n';
import { TelegramBotService } from './telegram-bot.service';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly telegramBotService: TelegramBotService) {}

  /**
   * Envoie une alerte Sentry à un utilisateur spécifique
   */
  async sendSentryAlert(userId: string, alertInfo: any) {
    try {
      const message = this.formatSentryAlertMessage(alertInfo);
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

  /**
   * Formate un message d'alerte Sentry
   */
  private formatSentryAlertMessage(alertInfo: any): string {
    const timestamp = new Date(alertInfo.timestamp).toLocaleString('en-US', {
      timeZone: 'America/New_York', // or keep as is, but change to English
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return `
🚨 <b>${i18n.t('TESLA SENTRY ALERT')}</b> 🚨

🚗 <b>${i18n.t('Vehicle')}:</b> ${alertInfo.vin}
⏰ <b>${i18n.t('Time')}:</b> ${timestamp}
📍 <b>${i18n.t('Location')}:</b> ${
      alertInfo.location || i18n.t('Not available')
    }
🔋 <b>${i18n.t('Battery')}:</b> ${alertInfo.batteryLevel || i18n.t('N/A')}%
🚗 <b>${i18n.t('Speed')}:</b> ${alertInfo.vehicleSpeed || '0'} km/h
🔔 <b>${i18n.t('Sentry Mode')}:</b> ${alertInfo.sentryMode || 'Aware'}
📱 <b>${i18n.t('Display')}:</b> ${alertInfo.centerDisplay || 'Unknown'}
🚨 <b>${i18n.t('Alarm State')}:</b> ${alertInfo.alarmState || 'Active'}

<i>${i18n.t('Sentry Mode activated - Check your vehicle!')}</i>
    `.trim();
  }
}
