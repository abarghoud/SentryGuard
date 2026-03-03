import { Injectable, Logger, Inject, OnModuleDestroy } from '@nestjs/common';
import { TelegramError } from 'telegraf';
import i18n from '../../i18n';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramMuteService } from './telegram-mute.service';
import { TelegramContextService } from './telegram-context.service';
import { TelegramBotUpdateService } from './telegram-bot-update.service';
import { telegramFailureHandler } from './interfaces/telegram-failure-handler.interface';
import type { ITelegramFailureHandler } from './interfaces/telegram-failure-handler.interface';
import { telegramRetryManager } from './telegram-retry-manager.token';
import { RetryManager } from '../shared/retry-manager.service';

type TelegramKeyboard = {
  inline_keyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
  keyboard?: Array<Array<{ text: string }>>;
  one_time_keyboard?: boolean;
  resize_keyboard?: boolean;
};

@Injectable()
export class TelegramService implements OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly telegramBotService: TelegramBotService,
    private readonly telegramMuteService: TelegramMuteService,
    private readonly telegramContextService: TelegramContextService,
    private readonly telegramBotUpdateService: TelegramBotUpdateService,
    @Inject(telegramFailureHandler) private readonly failureHandler: ITelegramFailureHandler,
    @Inject(telegramRetryManager) private readonly retryManager: RetryManager,
  ) {}

  async sendSentryAlert(
    userId: string,
    alertInfo: { vin: string, display_name?: string },
    userLanguage: 'en' | 'fr',
    keyboard?: TelegramKeyboard,
  ) {
    this.logger.debug(`[OPTIMIZATION] Using provided language: ${userLanguage} for user: ${userId}`);

    const message = this.formatSentryAlertMessage(alertInfo, userLanguage);

    if (await this.telegramMuteService.isNotificationMuted(userId)) {
      this.logger.log(`🔕 Sentry alert suppressed for muted user ${userId}`);
      return false;
    }

    const chatId = await this.telegramContextService.getChatIdFromUserId(userId);

    if (!chatId) {
      this.logger.warn(`⚠️ No chat_id found for user: ${userId}`);
      return false;
    }

    await this.telegramBotUpdateService.ensureUserIsUpToDate(userId, chatId, userLanguage);

    if (this.shouldSimulateMessage(alertInfo.vin)) {
      return await this.simulateMessage(userId, 'alert', alertInfo.vin);
    }

    const options = keyboard ? { keyboard } : undefined;

    try {
      const success = await this.telegramBotService.sendMessage(chatId, message, options);

      return success;
    } catch (error) {
      if (this.failureHandler.canHandle(error as Error)) {
        await this.failureHandler.handleFailure(error as Error, userId);
        this.logger.log(`[TELEGRAM_FAILURE_HANDLED] Error handled for user ${userId}`);

        return false;
      }

      if (this.isRetryableTelegramError(error)) {
        const correlationId = `telegram-alert-${userId}-${Date.now()}`;
        this.retryManager.addToRetry(
          async () => {
            await this.telegramBotService.sendMessage(chatId, message, options);
          },
          error as Error,
          correlationId
        );

        return false;
      }

      this.logError(userId, 'alert', error);

      throw error;
    }
  }

  onModuleDestroy() {
    this.retryManager.stop();
  }

  private isRetryableTelegramError(error: unknown): boolean {
    if (error instanceof TelegramError) {
      const retryableStatusCodes = [429, 500, 502, 503, 504, 529];
      return retryableStatusCodes.includes(error.code);
    }

    if (error instanceof Error) {
      const networkErrors = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ECONNABORTED', 'ENOTFOUND'];
      return networkErrors.some(code => error.message.includes(code));
    }

    return false;
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
