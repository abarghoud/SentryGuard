import { Inject, Injectable } from '@nestjs/common';
import { ChoiceQuestion, JsonValue, TypeSafeClient, choice } from '@typesafe-ai/sdk';
import { TelegramError } from 'telegraf';
import { ALERT_JUDGMENT_REQUEST_OPTIONS } from '../../config/typesafe-judgment.config';
import { logJudgment, logJudgmentFailure } from '../utils/typesafe-judgment-log.util';
import { typeSafeClient } from '../utils/typesafe-client.token';

enum TelegramSendErrorKind {
  UserBlockedBot = 'user_blocked_bot',
  UserDeactivated = 'user_deactivated',
  ChatNotFound = 'chat_not_found',
  TransientRetryable = 'transient_retryable',
  Unrelated = 'unrelated',
}

enum TeslaApiErrorKind {
  TokenRevoked = 'token_revoked',
  VehicleUnreachable = 'vehicle_unreachable',
  Other = 'other',
}

interface ErrorDescription {
  message: string;
  code: string | null;
  status: number | null;
  details: string | null;
  [key: string]: JsonValue;
}

const CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.8;
const RETRYABLE_TELEGRAM_STATUS_CODES = [429, 500, 502, 503, 504, 529];
const TESLA_TIMEOUT_ERROR_CODES = ['ECONNABORTED', 'ETIMEDOUT'];
const TESLA_UNREACHABLE_STATUS_CODES = [408, 504];
const BLOCKED_BOT_MESSAGES = ['bot was blocked by the user', 'forbidden: bot was blocked'];
const DEACTIVATED_USER_MESSAGE = 'user is deactivated';
const CHAT_NOT_FOUND_MESSAGE = 'chat not found';
const NETWORK_ERROR_CODES = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ECONNABORTED', 'ENOTFOUND'];
const RESPONSE_DETAILS_MAX_LENGTH = 1000;

const TELEGRAM_SEND_ERROR_DESCRIPTIONS: Record<TelegramSendErrorKind, string> = {
  [TelegramSendErrorKind.UserBlockedBot]: 'The user blocked the bot or stopped the conversation, so future sends will fail.',
  [TelegramSendErrorKind.UserDeactivated]: 'The Telegram user account was deactivated or deleted, so future sends will fail.',
  [TelegramSendErrorKind.ChatNotFound]: 'The target chat no longer exists or was never started, so future sends will fail.',
  [TelegramSendErrorKind.TransientRetryable]: 'A temporary network or server failure that may succeed if the send is retried later.',
  [TelegramSendErrorKind.Unrelated]: 'None of the above; the error says nothing about the chat or its reachability.',
};

const TESLA_API_ERROR_DESCRIPTIONS: Record<TeslaApiErrorKind, string> = {
  [TeslaApiErrorKind.TokenRevoked]: 'The Tesla access token was revoked or is no longer valid for this user.',
  [TeslaApiErrorKind.VehicleUnreachable]: 'The vehicle could not be reached in time, for example because it is asleep, offline, or a gateway timed out.',
  [TeslaApiErrorKind.Other]: 'Neither of the above; some other Tesla API failure.',
};

function buildTelegramSendErrorQuestion(): ChoiceQuestion<Record<TelegramSendErrorKind, string>> {
  return choice('What does this Telegram send failure mean for future sends to the same chat?', TELEGRAM_SEND_ERROR_DESCRIPTIONS);
}

function buildTeslaApiErrorQuestion(): ChoiceQuestion<Record<TeslaApiErrorKind, string>> {
  return choice('What does this Tesla API failure say about the token and the vehicle?', TESLA_API_ERROR_DESCRIPTIONS);
}

function buildErrorDescription(error: unknown): ErrorDescription {
  return {
    message: error instanceof Error ? error.message : String(error),
    code: readErrorCode(error),
    status: readResponseStatus(error),
    details: readResponseDetails(error),
  };
}

function readErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === 'string' || typeof code === 'number' ? String(code) : null;
}

function readResponseStatus(error: unknown): number | null {
  const response = readResponse(error);

  if (!response) {
    return null;
  }

  const status = (response as { status?: unknown }).status;

  return typeof status === 'number' ? status : null;
}

function readResponseDetails(error: unknown): string | null {
  const data = readResponseData(error);

  if (typeof data === 'string') {
    return data || null;
  }

  if (data && typeof data === 'object') {
    return stringifyResponseData(data);
  }

  return null;
}

function readResponse(error: unknown): Record<string, unknown> | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const response = (error as { response?: unknown }).response;

  if (typeof response !== 'object' || response === null) {
    return null;
  }

  return response as Record<string, unknown>;
}

function readResponseData(error: unknown): unknown {
  return readResponse(error)?.['data'] ?? null;
}

function stringifyResponseData(data: object): string | null {
  const { error, error_description: errorDescription } = data as {
    error?: unknown;
    error_description?: unknown;
  };
  const documented = [error, errorDescription]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');

  if (documented) {
    return documented;
  }

  try {
    return JSON.stringify(data).slice(0, RESPONSE_DETAILS_MAX_LENGTH) || null;
  } catch {
    return null;
  }
}

@Injectable()
export class ErrorMeaningClassifierService {
  private readonly telegramKindCache = new WeakMap<object, Promise<TelegramSendErrorKind>>();

  constructor(@Inject(typeSafeClient) private readonly client: TypeSafeClient | null) {}

  private classifyTelegramSendError(error: unknown): Promise<TelegramSendErrorKind> {
    if (typeof error !== 'object' || error === null) {
      return this.resolveTelegramKind(error);
    }

    const cached = this.telegramKindCache.get(error);

    if (cached) {
      return cached;
    }

    const pending = this.resolveTelegramKind(error);
    this.telegramKindCache.set(error, pending);

    return pending;
  }

  public async isTelegramContactGone(error: unknown): Promise<boolean> {
    const kind = await this.classifyTelegramSendError(error);

    return (
      kind === TelegramSendErrorKind.UserBlockedBot ||
      kind === TelegramSendErrorKind.UserDeactivated ||
      kind === TelegramSendErrorKind.ChatNotFound
    );
  }

  public async isRetryableTelegramSend(error: unknown): Promise<boolean> {
    const kind = await this.classifyTelegramSendError(error);

    return kind === TelegramSendErrorKind.TransientRetryable;
  }

  private async classifyTeslaApiError(error: unknown): Promise<TeslaApiErrorKind> {
    const description = buildErrorDescription(error);
    const exactKind = this.extractExactTeslaKind(description);

    if (exactKind) {
      return exactKind;
    }

    return this.judgeTeslaKind(description);
  }

  public async isTeslaTokenRevoked(error: unknown): Promise<boolean> {
    const kind = await this.classifyTeslaApiError(error);

    return kind === TeslaApiErrorKind.TokenRevoked;
  }

  private async resolveTelegramKind(error: unknown): Promise<TelegramSendErrorKind> {
    const description = buildErrorDescription(error);
    const exactKind = this.extractExactTelegramKind(error, description);

    if (exactKind) {
      return exactKind;
    }

    return this.judgeTelegramKind(description);
  }

  private extractExactTelegramKind(error: unknown, description: ErrorDescription): TelegramSendErrorKind | null {
    if (error instanceof TelegramError && description.code) {
      const numericCode = Number(description.code);

      if (RETRYABLE_TELEGRAM_STATUS_CODES.includes(numericCode)) {
        return TelegramSendErrorKind.TransientRetryable;
      }
    }

    return null;
  }

  private extractExactTeslaKind(description: ErrorDescription): TeslaApiErrorKind | null {
    if (description.code && TESLA_TIMEOUT_ERROR_CODES.includes(description.code)) {
      return TeslaApiErrorKind.VehicleUnreachable;
    }

    if (description.status && TESLA_UNREACHABLE_STATUS_CODES.includes(description.status)) {
      return TeslaApiErrorKind.VehicleUnreachable;
    }

    return null;
  }

  private async judgeTelegramKind(description: ErrorDescription): Promise<TelegramSendErrorKind> {
    const legacyKind = this.matchLegacyTelegramKind(description.message);

    if (legacyKind !== TelegramSendErrorKind.Unrelated || !this.client) {
      return legacyKind;
    }

    const startedAt = Date.now();

    try {
      return await this.askTelegramKind(this.client, description);
    } catch (requestError) {
      logJudgmentFailure('telegram-send-error', Date.now() - startedAt, requestError);

      return legacyKind;
    }
  }

  private async judgeTeslaKind(description: ErrorDescription): Promise<TeslaApiErrorKind> {
    if (!this.client) {
      return TeslaApiErrorKind.Other;
    }

    const startedAt = Date.now();

    try {
      return await this.askTeslaKind(this.client, description);
    } catch (requestError) {
      logJudgmentFailure('tesla-api-error', Date.now() - startedAt, requestError);

      return TeslaApiErrorKind.Other;
    }
  }

  private async askTelegramKind(client: TypeSafeClient, description: ErrorDescription): Promise<TelegramSendErrorKind> {
    const startedAt = Date.now();
    const result = await client.systemOne({
      state: description,
      questions: {
        kind: buildTelegramSendErrorQuestion(),
      },
    }, ALERT_JUDGMENT_REQUEST_OPTIONS);
    const answer = result.answers.kind;
    const accepted = answer.confidence >= CLASSIFICATION_CONFIDENCE_THRESHOLD;

    this.recordJudgment('telegram-send-error', answer.choice, answer.confidence, accepted, startedAt, result);

    return accepted ? answer.choice : TelegramSendErrorKind.Unrelated;
  }

  private async askTeslaKind(client: TypeSafeClient, description: ErrorDescription): Promise<TeslaApiErrorKind> {
    const startedAt = Date.now();
    const result = await client.systemOne({
      state: description,
      questions: {
        kind: buildTeslaApiErrorQuestion(),
      },
    }, ALERT_JUDGMENT_REQUEST_OPTIONS);
    const answer = result.answers.kind;
    const accepted = answer.confidence >= CLASSIFICATION_CONFIDENCE_THRESHOLD;

    this.recordJudgment('tesla-api-error', answer.choice, answer.confidence, accepted, startedAt, result);

    return accepted ? answer.choice : TeslaApiErrorKind.Other;
  }

  private recordJudgment(
    path: string,
    choice: string,
    confidence: number,
    accepted: boolean,
    startedAt: number,
    result: { model: string; usage: { input_tokens: number; output_tokens: number } }
  ): void {
    logJudgment({
      path,
      outcome: choice,
      accepted,
      durationMs: Date.now() - startedAt,
      model: result.model,
      inputTokens: result.usage.input_tokens,
      outputTokens: result.usage.output_tokens,
      scores: { confidence },
    });
  }

  private matchLegacyTelegramKind(message: string): TelegramSendErrorKind {
    const normalized = message.toLowerCase();

    if (BLOCKED_BOT_MESSAGES.some((blocked) => normalized.includes(blocked))) {
      return TelegramSendErrorKind.UserBlockedBot;
    }

    if (normalized.includes(DEACTIVATED_USER_MESSAGE)) {
      return TelegramSendErrorKind.UserDeactivated;
    }

    if (normalized.includes(CHAT_NOT_FOUND_MESSAGE)) {
      return TelegramSendErrorKind.ChatNotFound;
    }

    if (NETWORK_ERROR_CODES.some((code) => message.includes(code))) {
      return TelegramSendErrorKind.TransientRetryable;
    }

    return TelegramSendErrorKind.Unrelated;
  }
}
