import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { TelegramError } from 'telegraf';
import i18n from '../../i18n';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramMuteService } from './telegram-mute.service';
import { TelegramContextService } from './telegram-context.service';
import { TelegramBotUpdateService } from './telegram-bot-update.service';
import type { ITelegramFailureHandler } from './interfaces/telegram-failure-handler.interface';
import { telegramFailureHandler } from './interfaces/telegram-failure-handler.interface';
import { telegramRetryManager } from './telegram-retry-manager.token';
import { RetryManager } from '../shared/retry-manager.service';
import { OperationTimeoutError, withTimeout } from '../../common/utils/with-timeout.util';
import { CaughtError } from '../../common/utils/caught-error';
import { resolveVehicleLabel } from '../../common/utils/vehicle-label.util';
import { CounterMeasure } from '../alerts/enums/counter-measure.enum';
import { describeCounterMeasures } from '../alerts/common/counter-measure-description.util';
import { describeLateDelivery } from '../alerts/common/late-delivery-notice.util';
import { TelegramAlertInfo, TelegramMessageOptions } from './telegram.types';

export interface TelegramDeliveryResult {
  isDelivered: boolean;
}

type TelegramKeyboard = {
  inline_keyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
  keyboard?: Array<Array<{ text: string }>>;
  one_time_keyboard?: boolean;
  resize_keyboard?: boolean;
};

enum TelegramSendAttempt {
  Request = 'request',
  Retry = 'retry',
}

interface TelegramSendFailureContext {
  correlationPrefix: string;
  messageType: string;
  retrySend: () => Promise<unknown>;
  shouldScheduleRetry: boolean;
  userId: string;
}

interface TelegramSendRequest {
  attempt: TelegramSendAttempt;
  chatId: string;
  message: string;
  options?: TelegramMessageOptions;
}

interface TelegramSendState {
  deadline: number;
  hasRetriedStalledConnection: boolean;
  retryIndex: number;
}

interface ImmediateRetryDecision {
  delayMs: number;
  isStalledConnection: boolean;
}

const ATTEMPT_TIMEOUT_MS = 5_000;
const SEND_BUDGET_MS = 11_000;
const IMMEDIATE_RETRY_DELAYS_MS = [300, 1_000];
const MIN_ATTEMPT_BUDGET_MS = 1_000;
const STALLED_CONNECTION_ERROR_CODES = new Set(['ECONNRESET', 'EPIPE', 'ETIMEDOUT']);
const RATE_LIMIT_STATUS_CODE = 429;
const SERVER_ERROR_STATUS_CODE = 500;

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
      await withTimeout(
        (signal) => this.telegramBotUpdateService.ensureUserIsUpToDate(userId, chatId, userLanguage, signal),
        ATTEMPT_TIMEOUT_MS,
        `Telegram bot update request timed out after ${ATTEMPT_TIMEOUT_MS}ms`
      );

      if (this.shouldSimulateMessage(alertInfo.vin)) {
        return await this.simulateMessage(userId, 'alert', alertInfo.vin);
      }

      return await this.sendMessageWithTimeout(chatId, message, options);
    } catch (error) {
      return await this.handleSendFailure(error, {
        correlationPrefix: 'telegram-alert',
        messageType: 'sentry alert',
        retrySend: () => this.sendMessageWithTimeout(chatId, message, options, TelegramSendAttempt.Retry),
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
      await withTimeout(
        (signal) => this.telegramBotUpdateService.ensureUserIsUpToDate(userId, chatId, userLanguage, signal),
        ATTEMPT_TIMEOUT_MS,
        `Telegram bot update request timed out after ${ATTEMPT_TIMEOUT_MS}ms`
      );

      if (this.shouldSimulateMessage(alertInfo.vin)) {
        return await this.simulateMessage(userId, 'alert', alertInfo.vin);
      }

      return await this.sendMessageWithTimeout(chatId, message, options);
    } catch (error) {
      return await this.handleSendFailure(error, {
        correlationPrefix: 'telegram-alert-breakin',
        messageType: 'break-in alert',
        retrySend: () => this.sendMessageWithTimeout(chatId, message, options, TelegramSendAttempt.Retry),
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
      return await this.sendMessageWithTimeout(chatId, message);
    } catch (error) {
      return await this.handleSendFailure(error, {
        correlationPrefix: 'telegram-counter-measure',
        messageType: 'counter-measure notice',
        retrySend: () => this.sendMessageWithTimeout(chatId, message, undefined, TelegramSendAttempt.Retry),
        shouldScheduleRetry: true,
        userId,
      });
    }
  }

  private async sendMessageWithTimeout(
    chatId: string,
    message: string,
    options?: TelegramMessageOptions,
    attempt = TelegramSendAttempt.Request
  ): Promise<boolean> {
    return this.sendWithImmediateRetries(
      { attempt, chatId, message, options },
      { deadline: Date.now() + SEND_BUDGET_MS, hasRetriedStalledConnection: false, retryIndex: 0 }
    );
  }

  private async sendWithImmediateRetries(request: TelegramSendRequest, state: TelegramSendState): Promise<boolean> {
    try {
      return await this.attemptTelegramSend(request, state);
    } catch (error) {
      const decision = this.resolveImmediateRetry(error, state);
      if (decision === null) {
        throw error;
      }
      await this.waitForImmediateRetry(request.chatId, state.retryIndex, decision, error);
      return this.sendWithImmediateRetries(request, this.toNextSendState(state, decision));
    }
  }

  private attemptTelegramSend(request: TelegramSendRequest, state: TelegramSendState): Promise<boolean> {
    const attemptTimeoutMs = Math.max(Math.min(ATTEMPT_TIMEOUT_MS, state.deadline - Date.now()), 1);
    const useFreshConnection = state.retryIndex > 0;

    return withTimeout(
      (signal) => this.telegramBotService.sendMessage(request.chatId, request.message, request.options, signal, useFreshConnection),
      attemptTimeoutMs,
      `Telegram notification ${request.attempt} timed out after ${attemptTimeoutMs}ms`
    );
  }

  private toNextSendState(state: TelegramSendState, decision: ImmediateRetryDecision): TelegramSendState {
    return {
      deadline: state.deadline,
      hasRetriedStalledConnection: state.hasRetriedStalledConnection || decision.isStalledConnection,
      retryIndex: state.retryIndex + 1,
    };
  }

  private async waitForImmediateRetry(chatId: string, retryIndex: number, decision: ImmediateRetryDecision, error: unknown): Promise<void> {
    this.logger.warn(
      `[TELEGRAM_IMMEDIATE_RETRY] Retrying send to chat_id ${chatId} on a fresh connection in ${decision.delayMs}ms ` +
      `(retry ${retryIndex + 1}/${IMMEDIATE_RETRY_DELAYS_MS.length}): ${new CaughtError(error).describe()}` +
      (decision.isStalledConnection ? ' (possible duplicate)' : '')
    );

    if (decision.delayMs > 0) {
      await this.delay(decision.delayMs);
    }
  }

  private resolveImmediateRetry(error: unknown, state: TelegramSendState): ImmediateRetryDecision | null {
    const isStalledConnection = this.isStalledConnectionError(error);
    const delayMs = this.resolveImmediateRetryDelay(error, isStalledConnection, state);

    if (delayMs === null || Date.now() + delayMs + MIN_ATTEMPT_BUDGET_MS > state.deadline) {
      return null;
    }

    return { delayMs, isStalledConnection };
  }

  private resolveImmediateRetryDelay(error: unknown, isStalledConnection: boolean, state: TelegramSendState): number | null {
    if (state.retryIndex >= IMMEDIATE_RETRY_DELAYS_MS.length) {
      return null;
    }

    if (isStalledConnection) {
      return state.hasRetriedStalledConnection ? null : 0;
    }

    return this.resolveRetryDelayForError(error, IMMEDIATE_RETRY_DELAYS_MS[state.retryIndex]);
  }

  private isStalledConnectionError(error: unknown): boolean {
    if (error instanceof OperationTimeoutError) {
      return true;
    }

    return new CaughtError(error).codes().some((code) => STALLED_CONNECTION_ERROR_CODES.has(code));
  }

  private resolveRetryDelayForError(error: unknown, backoffMs: number): number | null {
    if (error instanceof TelegramError) {
      if (error.code === RATE_LIMIT_STATUS_CODE) {
        const retryAfterSeconds = error.parameters?.retry_after;
        return typeof retryAfterSeconds === 'number' ? retryAfterSeconds * 1000 : null;
      }

      return error.code >= SERVER_ERROR_STATUS_CODE ? backoffMs : null;
    }

    return new CaughtError(error).isTransientNetwork() ? backoffMs : null;
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
