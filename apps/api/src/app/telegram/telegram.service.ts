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
      const languageStart = Date.now();
      const userLanguage = await this.userLanguageService.getUserLanguage(userId);
      const languageTime = Date.now() - languageStart;

      if (languageTime > 100) {
        this.logger.warn(`[DB_SLOW][ALERT] Language lookup: ${languageTime}ms for user: ${userId}`);
      }

      const message = this.formatSentryAlertMessage(alertInfo, userLanguage);

      if (this.shouldSimulateMessage(alertInfo.vin)) {
        return await this.simulateMessage(userId, 'alert', alertInfo.vin);
      }

      const botStart = Date.now();
      const success = await this.telegramBotService.sendMessageToUser(userId, message);
      const botTime = Date.now() - botStart;

      if (botTime > 500) {
        this.logger.warn(`[TELEGRAM_SLOW][ALERT] Bot send: ${botTime}ms for user: ${userId}`);
      }

      this.logMessageResult(success, userId, 'alert');
      return success;
    } catch (error) {
      this.logError(userId, 'alert', error);
      return false;
    }
  }

  async sendTelegramMessage(userId: string, message: string, vin?: string) {
    try {
      if (this.shouldSimulateMessage(vin)) {
        return await this.simulateMessage(userId, 'message', vin);
      }

      const botStart = Date.now();
      const success = await this.telegramBotService.sendMessageToUser(userId, message);
      const botTime = Date.now() - botStart;

      if (botTime > 200) {
        this.logger.warn(`[TELEGRAM_SLOW][MESSAGE] Bot send: ${botTime}ms for user: ${userId} VIN: ${vin || 'unknown'}`);
      }

      this.logMessageResult(success, userId, 'message');
      return success;
    } catch (error) {
      this.logError(userId, 'message', error);
      return false;
    }
  }

  private shouldSimulateMessage(vin?: string): boolean {
    const isTestVin = vin === 'VIN-1' || vin === 'VIN-2';
    const simulateDelay = process.env.SIMULATE_TELEGRAM_DELAY_MS;

    return isTestVin && !!simulateDelay;
  }

  private async simulateMessage(userId: string, type: 'alert' | 'message', vin?: string): Promise<boolean> {
    const delay = type === 'alert' ? 200 : parseInt(process.env.SIMULATE_TELEGRAM_DELAY_MS || '0');

    await new Promise(resolve => setTimeout(resolve, delay));

    this.logger.log(`📱 [SIMULATED] ${type === 'alert' ? 'Sentry alert' : 'Telegram message'} sent to ${userId} for VIN ${vin}`);

    return true;
  }

  private logMessageResult(success: boolean, userId: string, type: 'alert' | 'message'): void {
    const messageType = type === 'alert' ? 'Sentry alert' : 'Telegram message';

    if (success) {
      this.logger.log(`📱 ${messageType} sent to user: ${userId}`);
    } else {
      this.logger.warn(`⚠️ Failed to send ${messageType.toLowerCase()} to user: ${userId}`);
    }
  }

  private logError(userId: string, type: 'alert' | 'message', error: unknown): void {
    const messageType = type === 'alert' ? 'sentry alert' : 'telegram message';
    
    this.logger.error(`❌ Failed to send ${messageType} to user: ${userId}:`, error);
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
