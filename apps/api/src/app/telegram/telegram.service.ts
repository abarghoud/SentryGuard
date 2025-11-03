import { Injectable, Logger } from '@nestjs/common';
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
    const timestamp = new Date(alertInfo.timestamp).toLocaleString('fr-FR', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return `
🚨 <b>ALERTE SENTINEL TESLA</b> 🚨

🚗 <b>Véhicule:</b> ${alertInfo.vin}
⏰ <b>Heure:</b> ${timestamp}
📍 <b>Localisation:</b> ${alertInfo.location || 'Non disponible'}
🔋 <b>Batterie:</b> ${alertInfo.batteryLevel || 'N/A'}%
🚗 <b>Vitesse:</b> ${alertInfo.vehicleSpeed || '0'} km/h
🔔 <b>Mode Sentry:</b> ${alertInfo.sentryMode || 'Aware'}
📱 <b>Affichage:</b> ${alertInfo.centerDisplay || 'Unknown'}
🚨 <b>État d'alarme:</b> ${alertInfo.alarmState || 'Active'}

<i>Mode Sentinel activé - Vérifiez votre véhicule!</i>
    `.trim();
  }
}
