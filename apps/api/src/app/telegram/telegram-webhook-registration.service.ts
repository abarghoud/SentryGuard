import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Context, Telegraf, Telegram } from 'telegraf';
import type { UserFromGetMe } from 'telegraf/types';
import type { AbortSignal as TelegrafAbortSignal } from 'abort-controller';

import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { CaughtError } from '../../common/utils/caught-error';
import { withTimeout } from '../../common/utils/with-timeout.util';
import { SchedulerLockKey } from '../../config/scheduler-lock-key.config';
import { TelegramWebhookRegistrationBusyError } from './telegram-webhook-registration-busy.error';
import { TelegramWebhookTarget } from './telegram-webhook.types';

const REGISTRATION_REQUEST_TIMEOUT_MS = 10_000;
const INITIAL_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 60_000;

@Injectable()
export class TelegramWebhookRegistrationService implements OnModuleDestroy {
  private readonly logger = new Logger(TelegramWebhookRegistrationService.name);
  private isStopping = false;

  constructor(private readonly distributedLockService: DistributedLockService) {}

  public async registerUntilReady(bot: Telegraf<Context>, target: TelegramWebhookTarget): Promise<void> {
    for (let attempt = 0; !this.isStopping; attempt++) {
      try {
        await this.initialize(bot, target);
        return;
      } catch (error) {
        await this.waitBeforeRetry(error, attempt);
      }
    }
  }

  public onModuleDestroy(): void {
    this.isStopping = true;
  }

  private async initialize(bot: Telegraf<Context>, target: TelegramWebhookTarget): Promise<void> {
    bot.botInfo ??= await this.fetchBotInfo(bot.telegram);
    await this.registerOnce(bot.telegram, target);
    this.logger.log('✅ Telegram bot initialized in webhook mode');
  }

  private fetchBotInfo(telegram: Telegram): Promise<UserFromGetMe> {
    return withTimeout(
      (signal) => telegram.callApi('getMe', {}, { signal: signal as TelegrafAbortSignal }),
      REGISTRATION_REQUEST_TIMEOUT_MS,
      `Telegram getMe timed out after ${REGISTRATION_REQUEST_TIMEOUT_MS}ms`
    );
  }

  private async registerOnce(telegram: Telegram, target: TelegramWebhookTarget): Promise<void> {
    const isRegistrationOwner = await this.distributedLockService.withLock(SchedulerLockKey.TelegramWebhookRegistration, () =>
      this.register(telegram, target)
    );

    if (!isRegistrationOwner) {
      throw new TelegramWebhookRegistrationBusyError();
    }
  }

  private async register(telegram: Telegram, target: TelegramWebhookTarget): Promise<void> {
    await this.setWebhook(telegram, target);
    this.logger.log(`[TELEGRAM_WEBHOOK] Webhook registered on ${this.redactSecretPath(target)}`);
  }

  private setWebhook(telegram: Telegram, target: TelegramWebhookTarget): Promise<true> {
    return withTimeout(
      (signal) => telegram.callApi('setWebhook', { secret_token: target.secretToken, url: target.url }, { signal: signal as TelegrafAbortSignal }),
      REGISTRATION_REQUEST_TIMEOUT_MS,
      `Telegram setWebhook timed out after ${REGISTRATION_REQUEST_TIMEOUT_MS}ms`
    );
  }

  private redactSecretPath(target: TelegramWebhookTarget): string {
    return target.url.replace(target.path, '/telegram/webhook/<redacted>');
  }

  private async waitBeforeRetry(error: unknown, attempt: number): Promise<void> {
    const backoffMs = Math.min(INITIAL_RETRY_DELAY_MS * 2 ** attempt, MAX_RETRY_DELAY_MS);
    const delayMs = new CaughtError(error).retryAfterMs() ?? backoffMs;

    this.logRetry(error, delayMs);
    await new Promise((resolve) => setTimeout(resolve, delayMs).unref());
  }

  private logRetry(error: unknown, delayMs: number): void {
    if (error instanceof TelegramWebhookRegistrationBusyError) {
      this.logger.log(`[TELEGRAM_WEBHOOK] Another instance is registering the webhook, registering again in ${delayMs}ms`);
      return;
    }

    this.logger.error(`❌ Telegram bot initialization error, retrying in ${delayMs}ms: ${new CaughtError(error).describe()}`);
  }
}
