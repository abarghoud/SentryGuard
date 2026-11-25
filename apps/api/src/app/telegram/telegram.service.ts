import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { TelegramError } from 'telegraf';
import i18n from '../../i18n';
import { TelegramMuteService } from './telegram-mute.service';
import { TelegramContextService } from './telegram-context.service';
import { TelegramBotUpdateService } from './telegram-bot-update.service';
import type { ITelegramFailureHandler } from './interfaces/telegram-failure-handler.interface';
import { telegramFailureHandler } from './interfaces/telegram-failure-handler.interface';
import { telegramRetryManager } from './telegram-retry-manager.token';
import { RetryManager } from '../shared/retry-manager.service';
import { CaughtError } from '../../common/utils/caught-error';
import { resolveVehicleLabel } from '../../common/utils/vehicle-label.util';
import { CounterMeasure } from '../alerts/enums/counter-measure.enum';
import { describeCounterMeasures } from '../alerts/common/counter-measure-description.util';
import { describeLateDelivery } from '../alerts/common/late-delivery-notice.util';
import { TelegramMessageSender } from './telegram-message-sender.service';
import { TelegramSendAttempt } from './telegram-send-attempt.enum';
import { TelegramAlertInfo, TelegramDeliveryResult, TelegramKeyboard } from './telegram.types';

interface TelegramSendFailureContext {
  correlationPrefix: string;
  messageType: string;
  retrySend: () => Promise<unknown>;
  shouldScheduleRetry: boolean;
  userId: string;
}

@Injectable()
export class TelegramService implements OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly telegramMuteService: TelegramMuteService,
    private readonly telegramContextService: TelegramContextService,
    private readonly telegramBotUpdateService: TelegramBotUpdateService,
    @Inject(telegramFailureHandler) private readonly failureHandler: ITelegramFailureHandler,
    @Inject(telegramRetryManager) private readonly retryManager: RetryManager,
    private readonly telegramMessageSender: TelegramMessageSender,
  ) { }

  public async sendSentryAlert(
    userId: string,
    alertInfo: TelegramAlertInfo,
    userLanguage: 'en' | 'fr',
    keyboard?: TelegramKeyboard,
    shouldScheduleRetry = true,
  ) {
    this.logger.debug(`[OPTIMIZATION] Using provided language: ${userLanguage} for user: ${userId}`);

    const message = this.formatSentryAlertMessage(alertInfo, userLanguage);

    if (await this.telegramMuteService.checkIsNotificationMuted(userId)) {
      this.logger.log(`🔕 Sentry alert suppressed for muted user ${userId}`);
      return false;
    }

    const chatId = await this.telegramContextService.getChatIdFromUserId(userId);

    if (!chatId) {
      this.logger.warn(`⚠️ No chat_id found for user: ${userId}`);
      return false;
    }

    const options = keyboard ? { keyboard } : undefined;

    try {
      await this.telegramBotUpdateService.ensureUserIsUpToDate(userId, chatId, userLanguage);

      if (this.shouldSimulateMessage(alertInfo.vin)) {
        return await this.simulateMessage(userId, 'alert', alertInfo.vin);
      }

      return await this.telegramMessageSender.send(chatId, message, options);
    } catch (error) {
      return await this.handleSendFailure(error, {
        correlationPrefix: 'telegram-alert',
        messageType: 'sentry alert',
        retrySend: () => this.telegramMessageSender.send(chatId, message, options, TelegramSendAttempt.Retry),
        shouldScheduleRetry,
        userId,
      });
    }
  }

  public async sendBreakInAlert(
    userId: string,
    alertInfo: TelegramAlertInfo,
    userLanguage: 'en' | 'fr',
    keyboard?: TelegramKeyboard,
    shouldScheduleRetry = true,
  ) {
    this.logger.debug(`[OPTIMIZATION] Using provided language: ${userLanguage} for user: ${userId}`);

    const message = this.formatBreakInAlertMessage(alertInfo, userLanguage);

    if (await this.telegramMuteService.checkIsNotificationMuted(userId)) {
      this.logger.log(`🔕 Break-in alert suppressed for muted user ${userId}`);
      return false;
    }

    const chatId = await this.telegramContextService.getChatIdFromUserId(userId);

    if (!chatId) {
      this.logger.warn(`⚠️ No chat_id found for user: ${userId}`);
      return false;
    }

    const options = keyboard ? { keyboard } : undefined;

    try {
      await this.telegramBotUpdateService.ensureUserIsUpToDate(userId, chatId, userLanguage);

      if (this.shouldSimulateMessage(alertInfo.vin)) {
        return await this.simulateMessage(userId, 'alert', alertInfo.vin);
      }

      return await this.telegramMessageSender.send(chatId, message, options);
    } catch (error) {
      return await this.handleSendFailure(error, {
        correlationPrefix: 'telegram-alert-breakin',
        messageType: 'break-in alert',
        retrySend: () => this.telegramMessageSender.send(chatId, message, options, TelegramSendAttempt.Retry),
        shouldScheduleRetry,
        userId,
      });
    }
  }

  public async sendCounterMeasureNotice(
    userId: string,
    alertInfo: { vin: string, display_name?: string },
    userLanguage: 'en' | 'fr',
    counterMeasures: CounterMeasure[],
  ): Promise<TelegramDeliveryResult> {
    if (await this.telegramMuteService.checkIsNotificationMuted(userId)) {
      this.logger.log(`🔕 Counter-measure notice suppressed for muted user ${userId}`);
      return { isDelivered: false };
    }

    const chatId = await this.telegramContextService.getChatIdFromUserId(userId);

    if (!chatId) {
      return { isDelivered: false };
    }

    const message = this.formatCounterMeasureMessage(alertInfo, userLanguage, counterMeasures);
    return { isDelivered: await this.sendCounterMeasureMessage(userId, chatId, message) };
  }

  onModuleDestroy() {
    this.retryManager.stop();
  }

  private isBlockedBotFailure(error: unknown): error is Error {
    return error instanceof Error && this.failureHandler.canHandle(error);
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


  private async sendCounterMeasureMessage(userId: string, chatId: string, message: string): Promise<boolean> {
    try {
      return await this.telegramMessageSender.send(chatId, message);
    } catch (error) {
      return await this.handleSendFailure(error, {
        correlationPrefix: 'telegram-counter-measure',
        messageType: 'counter-measure notice',
        retrySend: () => this.telegramMessageSender.send(chatId, message, undefined, TelegramSendAttempt.Retry),
        shouldScheduleRetry: true,
        userId,
      });
    }
  }

  private async handleSendFailure(error: unknown, context: TelegramSendFailureContext): Promise<false> {
    if (this.isBlockedBotFailure(error)) {
      await this.failureHandler.handleFailure(error, context.userId);
      this.logger.log(`[TELEGRAM_FAILURE_HANDLED] Error handled for user ${context.userId}`);
      return false;
    }

    if (this.isRetryableTelegramError(error) && context.shouldScheduleRetry) {
      this.scheduleRetry(error as Error, context);
      return false;
    }

    this.logError(context.userId, context.messageType, error);
    throw error;
  }

  private scheduleRetry(error: Error, { correlationPrefix, messageType, retrySend, userId }: TelegramSendFailureContext): void {
    this.logger.warn(`[TELEGRAM_RETRY] ${messageType} to user ${userId} scheduled for retry`);
    this.retryManager.addToRetry(async () => { await retrySend(); }, error, `${correlationPrefix}-${userId}-${Date.now()}`);
  }

  private logError(userId: string, messageType: string, error: unknown): void {
    this.logger.error(`❌ Failed to send ${messageType} to user: ${userId}: ${new CaughtError(error).describe()}`);
  }

  private formatSentryAlertMessage(
    { detectedAt, display_name, vin }: TelegramAlertInfo,
    lng: 'en' | 'fr'
  ): string {
    const message = `
🚨 <b>${i18n.t('TESLA SENTRY ALERT', { lng })}</b> 🚨

🚗 <b>${i18n.t('Vehicle', { lng })}:</b> ${resolveVehicleLabel(display_name, vin)}

<i>${i18n.t('Sentry Mode activated - Check your vehicle!', { lng })}</i>
    `.trim();

    return this.appendLateDeliveryNotice(message, detectedAt, lng);
  }

  private formatBreakInAlertMessage(
    { detectedAt, display_name, vin }: TelegramAlertInfo,
    lng: 'en' | 'fr'
  ): string {
    const message = `
🚨 <b>${i18n.t('TESLA BREAK-IN ALERT', { lng })}</b> 🚨

🚗 <b>${i18n.t('Vehicle', { lng })}:</b> ${resolveVehicleLabel(display_name, vin)}

<i>${i18n.t('Break-in attempt detected. Check your vehicle immediately!', { lng })}</i>
    `.trim();

    return this.appendLateDeliveryNotice(message, detectedAt, lng);
  }

  private appendLateDeliveryNotice(message: string, detectedAt: Date | undefined, lng: 'en' | 'fr'): string {
    const lateDeliveryNotice = describeLateDelivery(detectedAt, lng);
    return lateDeliveryNotice ? `${message}\n\n⏱️ <b>${lateDeliveryNotice}</b>` : message;
  }

  private formatCounterMeasureMessage(
    { display_name, vin }: { vin: string, display_name?: string },
    lng: 'en' | 'fr',
    counterMeasures: CounterMeasure[]
  ): string {
    return `
🛡️ <b>${i18n.t('RESPONSE TRIGGERED', { lng })}</b>

🚗 <b>${i18n.t('Vehicle', { lng })}:</b> ${resolveVehicleLabel(display_name, vin)}

<i>${describeCounterMeasures(counterMeasures, lng)}</i>
    `.trim();
  }
}
