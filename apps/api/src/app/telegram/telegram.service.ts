import { Injectable, Logger } from '@nestjs/common';
import i18n from '../../i18n';
import { TelegramBotService } from './telegram-bot.service';

type TelegramKeyboard = {
  inline_keyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
  keyboard?: Array<Array<{ text: string }>>;
  one_time_keyboard?: boolean;
  resize_keyboard?: boolean;
};

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly telegramBotService: TelegramBotService,
  ) {}

  async sendSentryAlert(
    userId: string,
    alertInfo: { vin: string, display_name?: string },
    userLanguage: 'en' | 'fr',
    keyboard?: TelegramKeyboard,
  ) {
    try {
      this.logger.debug(`[OPTIMIZATION] Using provided language: ${userLanguage} for user: ${userId}`);

      const message = this.formatSentryAlertMessage(alertInfo, userLanguage);

      if (this.shouldSimulateMessage(alertInfo.vin)) {
        return await this.simulateMessage(userId, 'alert', alertInfo.vin);
      }

      const options = keyboard ? { keyboard } : undefined;

      const success = await this.telegramBotService.sendMessageToUser(userId, message, options);

      return success;
    } catch (error) {
      this.logError(userId, 'alert', error);
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
