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

      // Simulation de délai pour les tests de performance (VIN de test seulement)
      const isTestVin = alertInfo.vin === 'TESTVIN123456789' || alertInfo.vin === 'XP7YGCERXSB724742';
      const simulateDelay = process.env.SIMULATE_TELEGRAM_DELAY_MS;

      let success: boolean;
      if (isTestVin && simulateDelay) {
        // Mode simulation pour les tests : délai fixe sans appel API réel
        const delayMs = parseInt(simulateDelay);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        success = true;
        this.logger.log(`📱 [SIMULATED] Alerte Sentry envoyée à ${userId} pour VIN ${alertInfo.vin} (delay: ${delayMs}ms)`);
      } else {
        // Mode normal : appel API réel
        success = await this.telegramBotService.sendMessageToUser(userId, message);
        if (success) {
          this.logger.log(`📱 Alerte Sentry envoyée à l'utilisateur: ${userId}`);
        } else {
          this.logger.warn(
            `⚠️ Impossible d'envoyer l'alerte à l'utilisateur: ${userId}`
          );
        }
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
  async sendTelegramMessage(userId: string, message: string, vin?: string) {
    try {
      // Simulation de délai pour les tests de performance (VIN de test seulement)
      const isTestVin = vin === 'TESTVIN123456789' || vin === 'XP7YGCERXSB724742';
      const simulateDelay = process.env.SIMULATE_TELEGRAM_DELAY_MS;

      let success: boolean;
      if (isTestVin && simulateDelay) {
        // Mode simulation pour les tests : délai fixe sans appel API réel
        const delayMs = parseInt(simulateDelay);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        success = true;
        this.logger.log(`📱 [SIMULATED] Message Telegram envoyé à ${userId} pour VIN ${vin} (delay: ${delayMs}ms)`);
      } else {
        // Mode normal : appel API réel
        success = await this.telegramBotService.sendMessageToUser(userId, message);
        if (success) {
          this.logger.log(
            `📱 Message Telegram envoyé à l'utilisateur: ${userId}`
          );
        } else {
          this.logger.warn(
            `⚠️ Impossible d'envoyer le message à l'utilisateur: ${userId}`
          );
        }
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

🚗 <b>${i18n.t('Vehicle', { lng })}:</b> ${display_name ?? vin}

<i>${i18n.t('Sentry Mode activated - Check your vehicle!', { lng })}</i>
    `.trim();
  }
}
