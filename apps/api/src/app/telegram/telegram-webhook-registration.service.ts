import { Injectable, Logger } from '@nestjs/common';
import type { Telegram } from 'telegraf';
import type { AbortSignal as TelegrafAbortSignal } from 'abort-controller';

import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { withTimeout } from '../../common/utils/with-timeout.util';
import { SchedulerLockKey } from '../../config/scheduler-lock-key.config';

const REGISTRATION_REQUEST_TIMEOUT_MS = 10_000;

export class TelegramWebhookRegistrationBusyError extends Error {
  constructor() {
    super('Another instance is registering the Telegram webhook');
    this.name = 'TelegramWebhookRegistrationBusyError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface TelegramWebhookTarget {
  path: string;
  secretToken: string;
  url: string;
}

@Injectable()
export class TelegramWebhookRegistrationService {
  private readonly logger = new Logger(TelegramWebhookRegistrationService.name);

  constructor(private readonly distributedLockService: DistributedLockService) {}

  public async registerOnce(telegram: Telegram, target: TelegramWebhookTarget): Promise<void> {
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
}
