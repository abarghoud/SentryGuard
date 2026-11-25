import { Logger } from '@nestjs/common';
import { TelegramError } from 'telegraf';
import type { Context, Telegraf } from 'telegraf';
import type { UserFromGetMe } from 'telegraf/types';

import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { SchedulerLockKey } from '../../config/scheduler-lock-key.config';
import { TelegramWebhookRegistrationService } from './telegram-webhook-registration.service';

const fakeSecretPath = 'fake-secret-path-0123456789';
const fakeBotInfo = { username: 'FakeBot' } as UserFromGetMe;
const target = {
  path: `/telegram/webhook/${fakeSecretPath}`,
  secretToken: 'fake-secret-token-0123456789abcdef',
  url: `https://api.example.test/telegram/webhook/${fakeSecretPath}`,
};

describe('The TelegramWebhookRegistrationService class', () => {
  let withLock: jest.Mock;
  let getMe: jest.Mock;
  let setWebhook: jest.Mock;
  let bot: Telegraf<Context>;
  let service: TelegramWebhookRegistrationService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    withLock = jest.fn(async (_lockKey: number, task: () => Promise<void>) => {
      await task();
      return true;
    });
    getMe = jest.fn().mockResolvedValue(fakeBotInfo);
    setWebhook = jest.fn().mockResolvedValue(true);
    const callApi = jest.fn((method: string) => (method === 'getMe' ? getMe() : setWebhook(method)));
    bot = { telegram: { callApi } } as unknown as Telegraf<Context>;
    service = new TelegramWebhookRegistrationService({ withLock } as unknown as DistributedLockService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const callApiOf = (): jest.Mock => bot.telegram.callApi as unknown as jest.Mock;

  describe('The registerUntilReady() method', () => {
    describe('When Telegram answers right away', () => {
      beforeEach(async () => {
        await service.registerUntilReady(bot, target);
      });

      it('should register under the dedicated distributed lock', () => {
        expect(withLock).toHaveBeenCalledWith(SchedulerLockKey.TelegramWebhookRegistration, expect.any(Function));
      });

      it('should set the webhook with the current secret token without dropping pending updates', () => {
        expect(callApiOf()).toHaveBeenCalledWith('setWebhook', { secret_token: target.secretToken, url: target.url }, expect.anything());
      });

      it('should keep the bot info from getMe on the bot', () => {
        expect(bot.botInfo).toBe(fakeBotInfo);
      });
    });

    describe('When the bot info is already known', () => {
      it('should not call getMe again', async () => {
        bot.botInfo = fakeBotInfo;

        await service.registerUntilReady(bot, target);

        expect(getMe).not.toHaveBeenCalled();
      });
    });

    describe('When the webhook was registered', () => {
      it('should never log the secret path', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

        await service.registerUntilReady(bot, target);

        expect(logSpy.mock.calls.flat().join(' ')).not.toContain(fakeSecretPath);
      });
    });

    describe('When another instance holds the registration lock', () => {
      beforeEach(() => {
        withLock.mockResolvedValueOnce(false);
        void service.registerUntilReady(bot, target);
      });

      it('should not call setWebhook while the other instance registers', async () => {
        await jest.advanceTimersByTimeAsync(0);

        expect(setWebhook).not.toHaveBeenCalled();
      });

      it('should register again itself once the other instance is done', async () => {
        await jest.advanceTimersByTimeAsync(1000);

        expect(setWebhook).toHaveBeenCalledTimes(1);
      });
    });

    describe('When Telegram rate-limits the initialization with retry_after', () => {
      beforeEach(() => {
        getMe.mockRejectedValueOnce(
          new TelegramError({ error_code: 429, description: 'Too Many Requests: retry after 1', parameters: { retry_after: 1 } })
        );
        void service.registerUntilReady(bot, target);
      });

      it('should not retry before retry_after has elapsed', async () => {
        await jest.advanceTimersByTimeAsync(999);

        expect(setWebhook).not.toHaveBeenCalled();
      });

      it('should complete the registration once retry_after has elapsed', async () => {
        await jest.advanceTimersByTimeAsync(1000);

        expect(setWebhook).toHaveBeenCalledTimes(1);
      });
    });

    describe('When the registration keeps failing without retry_after', () => {
      beforeEach(() => {
        setWebhook.mockRejectedValueOnce(new Error('read ECONNRESET')).mockRejectedValueOnce(new Error('read ECONNRESET'));
        void service.registerUntilReady(bot, target);
      });

      it('should back off exponentially between attempts', async () => {
        await jest.advanceTimersByTimeAsync(2999);

        expect(setWebhook).toHaveBeenCalledTimes(2);
      });

      it('should stop retrying once the registration succeeds', async () => {
        await jest.advanceTimersByTimeAsync(60_000);

        expect(setWebhook).toHaveBeenCalledTimes(3);
      });
    });

    describe('When the module is destroyed while the registration is failing', () => {
      it('should stop retrying', async () => {
        setWebhook.mockRejectedValue(new Error('read ECONNRESET'));
        void service.registerUntilReady(bot, target);
        await jest.advanceTimersByTimeAsync(0);

        service.onModuleDestroy();
        await jest.advanceTimersByTimeAsync(60_000);

        expect(setWebhook).toHaveBeenCalledTimes(1);
      });
    });
  });
});
