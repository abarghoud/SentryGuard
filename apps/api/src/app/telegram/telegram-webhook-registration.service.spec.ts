import { Logger } from '@nestjs/common';
import type { Telegram } from 'telegraf';

import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { SchedulerLockKey } from '../../config/scheduler-lock-key.config';
import { TelegramWebhookRegistrationBusyError, TelegramWebhookRegistrationService } from './telegram-webhook-registration.service';

const fakeSecretPath = 'fake-secret-path-0123456789';
const target = {
  path: `/telegram/webhook/${fakeSecretPath}`,
  secretToken: 'fake-secret-token-0123456789abcdef',
  url: `https://api.example.test/telegram/webhook/${fakeSecretPath}`,
};

describe('The TelegramWebhookRegistrationService class', () => {
  let withLock: jest.Mock;
  let callApi: jest.Mock;
  let telegram: Telegram;
  let service: TelegramWebhookRegistrationService;

  beforeEach(() => {
    withLock = jest.fn(async (_lockKey: number, task: () => Promise<void>) => {
      await task();
      return true;
    });
    callApi = jest.fn().mockResolvedValue(true);
    telegram = { callApi } as unknown as Telegram;
    service = new TelegramWebhookRegistrationService({ withLock } as unknown as DistributedLockService);
  });

  describe('The registerOnce() method', () => {
    describe('When this instance holds the registration lock', () => {
      beforeEach(async () => {
        await service.registerOnce(telegram, target);
      });

      it('should register under the dedicated distributed lock', () => {
        expect(withLock).toHaveBeenCalledWith(SchedulerLockKey.TelegramWebhookRegistration, expect.any(Function));
      });

      it('should set the webhook with the current secret token without dropping pending updates', () => {
        expect(callApi).toHaveBeenCalledWith('setWebhook', { secret_token: target.secretToken, url: target.url }, expect.anything());
      });
    });

    describe('When the webhook was registered', () => {
      it('should never log the secret path', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

        await service.registerOnce(telegram, target);

        expect(logSpy.mock.calls.flat().join(' ')).not.toContain(fakeSecretPath);
      });
    });

    describe('When another instance holds the registration lock', () => {
      let act: () => Promise<void>;

      beforeEach(() => {
        withLock.mockResolvedValue(false);
        act = () => service.registerOnce(telegram, target);
      });

      it('should report that the registration is busy so this instance registers again later', async () => {
        await expect(act()).rejects.toBeInstanceOf(TelegramWebhookRegistrationBusyError);
      });

      it('should not call Telegram', async () => {
        await act().catch(() => undefined);

        expect(callApi).not.toHaveBeenCalled();
      });
    });

    describe('When Telegram rate-limits the registration', () => {
      it('should propagate the error so the initialization retries', async () => {
        const rateLimitError = new Error('429: Too Many Requests: retry after 1');
        callApi.mockRejectedValue(rateLimitError);

        await expect(service.registerOnce(telegram, target)).rejects.toThrow(rateLimitError);
      });
    });
  });
});
