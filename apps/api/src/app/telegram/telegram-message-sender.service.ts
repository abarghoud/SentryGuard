import { Injectable, Logger } from '@nestjs/common';
import { TelegramError } from 'telegraf';

import { TELEGRAM_REQUEST_TIMEOUT_MS } from '../../config/telegram-request-timeout.config';
import { CaughtError } from '../../common/utils/caught-error';
import { OperationTimeoutError } from '../../common/utils/operation-timeout.error';
import { withTimeout } from '../../common/utils/with-timeout.util';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramSendAttempt } from './telegram-send-attempt.enum';
import { TelegramMessageOptions } from './telegram.types';

const SEND_BUDGET_MS = 11_000;
const IMMEDIATE_RETRY_DELAYS_MS = [300, 1_000];
const MIN_ATTEMPT_BUDGET_MS = 1_000;
const STALLED_CONNECTION_ERROR_CODES = new Set(['ECONNRESET', 'EPIPE', 'ETIMEDOUT']);
const RATE_LIMIT_STATUS_CODE = 429;
const SERVER_ERROR_STATUS_CODE = 500;

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

@Injectable()
export class TelegramMessageSender {
  private readonly logger = new Logger(TelegramMessageSender.name);

  constructor(private readonly telegramBotService: TelegramBotService) {}

  public async send(
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
      return await this.attemptSend(request, state);
    } catch (error) {
      const decision = this.resolveImmediateRetry(error, state);
      if (decision === null) {
        throw error;
      }
      await this.waitForImmediateRetry(request.chatId, state.retryIndex, decision, error);
      return this.sendWithImmediateRetries(request, this.toNextSendState(state, decision));
    }
  }

  private attemptSend(request: TelegramSendRequest, state: TelegramSendState): Promise<boolean> {
    const attemptTimeoutMs = Math.max(Math.min(TELEGRAM_REQUEST_TIMEOUT_MS, state.deadline - Date.now()), 1);
    const shouldUseFreshConnection = state.retryIndex > 0;

    return withTimeout(
      (signal) => this.telegramBotService.sendMessage(request.chatId, request.message, request.options, signal, shouldUseFreshConnection),
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
      await new Promise((resolve) => setTimeout(resolve, decision.delayMs));
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
      return this.resolveTelegramErrorRetryDelay(error, backoffMs);
    }

    return new CaughtError(error).isTransientNetwork() ? backoffMs : null;
  }

  private resolveTelegramErrorRetryDelay(error: TelegramError, backoffMs: number): number | null {
    if (error.code === RATE_LIMIT_STATUS_CODE) {
      const retryAfterSeconds = error.parameters?.retry_after;
      return typeof retryAfterSeconds === 'number' ? retryAfterSeconds * 1000 : null;
    }

    return error.code >= SERVER_ERROR_STATUS_CODE ? backoffMs : null;
  }
}
