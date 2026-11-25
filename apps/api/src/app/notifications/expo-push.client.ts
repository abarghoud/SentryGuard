import { Injectable, Logger } from '@nestjs/common';

import { NOTIFICATION_REQUEST_TIMEOUT_MS } from '../../config/notification-timeout.config';
import { CaughtError } from '../../common/utils/caught-error';
import { OperationTimeoutError } from '../../common/utils/operation-timeout.error';
import { withTimeout } from '../../common/utils/with-timeout.util';
import { ExpoPushError } from './expo-push.error';
import { ExpoPushRecipient } from './expo-push.types';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RETRY_DELAYS_MS = [1_000, 3_000];
const EXPO_RETRY_BUDGET_MS = 2 * NOTIFICATION_REQUEST_TIMEOUT_MS;
const EXPO_MIN_ATTEMPT_BUDGET_MS = 2_000;
const RATE_LIMIT_STATUS_CODE = 429;
const SERVER_ERROR_STATUS_CODE = 500;

interface ExpoPushTicket {
  details?: {
    error?: string;
  };
  id?: string;
  message?: string;
  status?: string;
}

interface ExpoPushResponse {
  data?: ExpoPushTicket | ExpoPushTicket[];
  errors?: Array<{ code?: string; message?: string }>;
}

interface ExpoPushAttempt {
  recipient: ExpoPushRecipient;
  retryIndex: number;
  startedAt: number;
}

@Injectable()
export class ExpoPushClient {
  private readonly logger = new Logger(ExpoPushClient.name);

  public async send(message: object, recipient: ExpoPushRecipient): Promise<void> {
    const startedAt = Date.now();

    for (let retryIndex = 0; ; retryIndex++) {
      try {
        await this.attemptSend(message, recipient, startedAt);
        return;
      } catch (error) {
        await this.waitForRetryOrRethrow(error, { recipient, retryIndex, startedAt });
      }
    }
  }

  private async attemptSend(message: object, recipient: ExpoPushRecipient, startedAt: number): Promise<void> {
    const pushStart = Date.now();
    const attemptTimeoutMs = Math.max(Math.min(NOTIFICATION_REQUEST_TIMEOUT_MS, startedAt + EXPO_RETRY_BUDGET_MS - pushStart), 1);
    const response = await withTimeout(
      (signal) => this.post(message, signal),
      attemptTimeoutMs,
      `Expo push request timed out after ${attemptTimeoutMs}ms`
    );

    this.logger.log(`[EXPO_PUSH_LATENCY][${recipient.correlationId || 'none'}] Push sent to device ${recipient.deviceId} in ${Date.now() - pushStart}ms`);
    await this.handleResponse(recipient, response);
  }

  private async post(message: object, signal: AbortSignal): Promise<Response> {
    return fetch(EXPO_PUSH_URL, {
      body: JSON.stringify(message),
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      method: 'POST',
      signal,
    });
  }

  private async waitForRetryOrRethrow(error: unknown, attempt: ExpoPushAttempt): Promise<void> {
    const correlationId = attempt.recipient.correlationId || 'none';
    const delayMs = this.resolveRetryDelay(error, attempt.retryIndex, attempt.startedAt);

    if (delayMs === null) {
      this.logger.error(`[NOTIFICATION_ERROR] Failed to send push notification: ${new CaughtError(error).describe()} (correlation: ${correlationId})`);
      throw error;
    }

    this.logger.warn(`[EXPO_PUSH_RETRY][${correlationId}] Retrying push to device ${attempt.recipient.deviceId} in ${delayMs}ms (retry ${attempt.retryIndex + 1}/${EXPO_RETRY_DELAYS_MS.length}): ${new CaughtError(error).describe()}`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  private resolveRetryDelay(error: unknown, retryIndex: number, startedAt: number): number | null {
    if (retryIndex >= EXPO_RETRY_DELAYS_MS.length || !this.isRetryable(error)) {
      return null;
    }

    const retryAfterMs = error instanceof ExpoPushError ? error.retryAfterMs ?? 0 : 0;
    const delayMs = Math.max(EXPO_RETRY_DELAYS_MS[retryIndex], retryAfterMs);
    const elapsedMs = Date.now() - startedAt;

    return elapsedMs + delayMs + EXPO_MIN_ATTEMPT_BUDGET_MS > EXPO_RETRY_BUDGET_MS ? null : delayMs;
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof OperationTimeoutError) {
      return false;
    }

    if (error instanceof ExpoPushError) {
      return !error.isDeviceNotRegistered && this.isRetryableStatus(error.status);
    }

    return new CaughtError(error).isTransientNetwork();
  }

  private isRetryableStatus(status: number | undefined): boolean {
    return status === RATE_LIMIT_STATUS_CODE || (status !== undefined && status >= SERVER_ERROR_STATUS_CODE);
  }

  private async handleResponse(recipient: ExpoPushRecipient, response: Response): Promise<void> {
    const result = await this.parseResponse(response);
    const tickets = this.extractTickets(result);

    if (!response.ok || this.hasRejection(result, tickets)) {
      this.reject(recipient, response, this.resolveRejectionMessage(response, result, tickets), this.hasUnregisteredDevice(tickets));
    }
  }

  private hasRejection(result: ExpoPushResponse, tickets: ExpoPushTicket[]): boolean {
    const isAccepted = tickets.some((ticket) => ticket.status === 'ok');
    const hasError = tickets.some((ticket) => ticket.status === 'error') || (result.errors ?? []).length > 0;
    return !isAccepted && hasError;
  }

  private hasUnregisteredDevice(tickets: ExpoPushTicket[]): boolean {
    return tickets.some((ticket) => ticket.details?.error === 'DeviceNotRegistered');
  }

  private resolveRejectionMessage(response: Response, result: ExpoPushResponse, tickets: ExpoPushTicket[]): string {
    return (
      tickets.find((ticket) => ticket.message)?.message ??
      result.errors?.find((error) => error.message)?.message ??
      (response.statusText || 'Expo push rejected')
    );
  }

  private reject(recipient: ExpoPushRecipient, response: Response, message: string, isDeviceNotRegistered: boolean): never {
    this.logger.warn(`[NOTIFICATION_ERROR] Expo push rejected token ${recipient.deviceId}: ${message} (status: ${response.status ?? 'unknown'})`);
    throw new ExpoPushError(message, response.status, this.parseRetryAfterMs(response), isDeviceNotRegistered);
  }

  private extractTickets(result: ExpoPushResponse): ExpoPushTicket[] {
    if (!result.data) {
      return [];
    }

    return Array.isArray(result.data) ? result.data : [result.data];
  }

  private parseRetryAfterMs(response: Response): number | undefined {
    const retryAfterSeconds = Number(response.headers?.get?.('retry-after'));
    return Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : undefined;
  }

  private async parseResponse(response: Response): Promise<ExpoPushResponse> {
    try {
      return (await response.json()) as ExpoPushResponse;
    } catch {
      return {};
    }
  }
}
