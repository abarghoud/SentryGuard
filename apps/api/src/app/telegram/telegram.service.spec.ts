import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { TelegramError } from 'telegraf';
import { TelegramService } from './telegram.service';
import { TelegramMessageSender } from './telegram-message-sender.service';
import { TelegramDeliveryResult } from './telegram.types';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramMuteService } from './telegram-mute.service';
import { TelegramContextService } from './telegram-context.service';
import { TelegramBotUpdateService } from './telegram-bot-update.service';
import { telegramFailureHandler } from './interfaces/telegram-failure-handler.interface';
import type { ITelegramFailureHandler } from './interfaces/telegram-failure-handler.interface';
import { telegramRetryManager } from './telegram-retry-manager.token';
import { RetryManager } from '../shared/retry-manager.service';
import { CounterMeasure } from '../alerts/enums/counter-measure.enum';

jest.mock('../../i18n', () => ({
  __esModule: true,
  default: {
    t: jest.fn((key: string, options?: any) => {
      const translations: Record<string, Record<string, string>> = {
        en: {
          'TESLA SENTRY ALERT': 'TESLA SENTRY ALERT',
          Vehicle: 'Vehicle',
          'Sentry Mode activated - Check your vehicle!':
            'Sentry Mode activated - Check your vehicle!',
        },
        fr: {
          'TESLA SENTRY ALERT': 'ALERTE SENTRY TESLA',
          Vehicle: 'Véhicule',
          'Sentry Mode activated - Check your vehicle!':
            'Mode Sentry activé - Vérifiez votre véhicule!',
        },
      };
      const lng = options?.lng || 'en';
      return translations[lng]?.[key] || key;
    }),
  },
}));

describe('The TelegramService class', () => {
  const fakeChatId = 'chat-123';
  const fakeUserId = 'user-123';

  let service: TelegramService;

  const mockTelegramBotService: MockProxy<TelegramBotService> = mock<TelegramBotService>();
  const mockTelegramMuteService: MockProxy<TelegramMuteService> = mock<TelegramMuteService>();
  const mockTelegramContextService: MockProxy<TelegramContextService> = mock<TelegramContextService>();
  const mockTelegramBotUpdateService: MockProxy<TelegramBotUpdateService> = mock<TelegramBotUpdateService>();
  const mockTelegramFailureHandler: MockProxy<ITelegramFailureHandler> = mock<ITelegramFailureHandler>();
  const mockRetryManager: MockProxy<RetryManager> = mock<RetryManager>();

  beforeEach(async () => {
    mockTelegramMuteService.checkIsNotificationMuted.mockResolvedValue(false);
    mockTelegramContextService.getChatIdFromUserId.mockResolvedValue(fakeChatId);
    mockTelegramBotUpdateService.ensureUserIsUpToDate.mockResolvedValue(undefined);
    mockTelegramFailureHandler.canHandle.mockReturnValue(false);
    mockTelegramFailureHandler.handleFailure.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        TelegramMessageSender,
        { provide: TelegramBotService, useValue: mockTelegramBotService },
        { provide: TelegramMuteService, useValue: mockTelegramMuteService },
        { provide: TelegramContextService, useValue: mockTelegramContextService },
        { provide: TelegramBotUpdateService, useValue: mockTelegramBotUpdateService },
        { provide: telegramFailureHandler, useValue: mockTelegramFailureHandler },
        { provide: telegramRetryManager, useValue: mockRetryManager },
      ],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('The sendSentryAlert() method', () => {
    const alertInfo = { vin: 'TEST123456' };

    describe('When the user is muted', () => {
      beforeEach(() => {
        mockTelegramMuteService.checkIsNotificationMuted.mockResolvedValue(true);
      });

      it('should return false without sending a message', async () => {
        const result = await service.sendSentryAlert(fakeUserId, alertInfo, 'en');

        expect(result).toBe(false);
        expect(mockTelegramBotService.sendMessage).not.toHaveBeenCalled();
      });
    });

    describe('When no chat_id is found for the user', () => {
      beforeEach(() => {
        mockTelegramContextService.getChatIdFromUserId.mockResolvedValue(null);
      });

      it('should return false without sending a message', async () => {
        const result = await service.sendSentryAlert(fakeUserId, alertInfo, 'en');

        expect(result).toBe(false);
        expect(mockTelegramBotService.sendMessage).not.toHaveBeenCalled();
      });
    });

    describe('When alert is sent in English with VIN only', () => {
      beforeEach(() => {
        mockTelegramBotService.sendMessage.mockResolvedValue(true);
      });

      it('should send the message to the resolved chat_id', async () => {
        await service.sendSentryAlert(fakeUserId, alertInfo, 'en');

        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledWith(
          fakeChatId,
          expect.stringContaining('TESLA SENTRY ALERT'),
          undefined,
          expect.any(AbortSignal),
          false
        );
      });

      it('should include the VIN in the message', async () => {
        await service.sendSentryAlert(fakeUserId, alertInfo, 'en');

        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledWith(
          fakeChatId,
          expect.stringContaining('TEST123456'),
          undefined,
          expect.any(AbortSignal),
          false
        );
      });

      it('should call ensureUserIsUpToDate before sending', async () => {
        await service.sendSentryAlert(fakeUserId, alertInfo, 'en');

        expect(mockTelegramBotUpdateService.ensureUserIsUpToDate).toHaveBeenCalledWith(fakeUserId, fakeChatId, 'en');
      });
    });

    describe('When alert is sent in French with a display name', () => {
      const frAlertInfo = { vin: 'TEST123456', display_name: 'Mon Tesla' };

      beforeEach(() => {
        mockTelegramBotService.sendMessage.mockResolvedValue(true);
      });

      it('should use translated strings', async () => {
        await service.sendSentryAlert(fakeUserId, frAlertInfo, 'fr');

        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledWith(
          fakeChatId,
          expect.stringContaining('ALERTE SENTRY TESLA'),
          undefined,
          expect.any(AbortSignal),
          false
        );
      });

      it('should display the display_name instead of VIN', async () => {
        await service.sendSentryAlert(fakeUserId, frAlertInfo, 'fr');

        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledWith(
          fakeChatId,
          expect.stringContaining('Mon Tesla'),
          undefined,
          expect.any(AbortSignal),
          false
        );
      });

      it('should not include the VIN when display_name is provided', async () => {
        await service.sendSentryAlert(fakeUserId, frAlertInfo, 'fr');

        expect(mockTelegramBotService.sendMessage).not.toHaveBeenCalledWith(
          fakeChatId,
          expect.stringContaining('TEST123456'),
          undefined,
          expect.any(AbortSignal),
          false
        );
      });
    });

    describe('When the alert is delivered hours after it was detected', () => {
      it('should tell the user that the alert is late', async () => {
        mockTelegramBotService.sendMessage.mockResolvedValue(true);

        await service.sendSentryAlert(fakeUserId, { ...alertInfo, detectedAt: new Date(Date.now() - 3 * 3_600_000) }, 'en');

        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledWith(
          fakeChatId,
          expect.stringContaining('Delayed alert'),
          undefined,
          expect.any(AbortSignal),
          false
        );
      });
    });

    describe('When the alert is delivered right after it was detected', () => {
      it('should not mention any delay', async () => {
        mockTelegramBotService.sendMessage.mockResolvedValue(true);

        await service.sendSentryAlert(fakeUserId, { ...alertInfo, detectedAt: new Date(Date.now() - 30_000) }, 'en');

        expect(mockTelegramBotService.sendMessage).not.toHaveBeenCalledWith(
          fakeChatId,
          expect.stringContaining('Delayed alert'),
          undefined,
          expect.any(AbortSignal),
          false
        );
      });
    });

    describe('When the failure handler can handle the error', () => {
      it('should call handleFailure and return false', async () => {
        const testError = new Error('Forbidden: bot was blocked by the user');

        mockTelegramBotService.sendMessage.mockRejectedValue(testError);
        mockTelegramFailureHandler.canHandle.mockReturnValue(true);

        const result = await service.sendSentryAlert(fakeUserId, alertInfo, 'en');

        expect(mockTelegramFailureHandler.canHandle).toHaveBeenCalledWith(testError);
        expect(mockTelegramFailureHandler.handleFailure).toHaveBeenCalledWith(testError, fakeUserId);
        expect(result).toBe(false);
      });
    });

    describe('When the bot UI update fails because the bot is blocked', () => {
      const blockedBotError = new Error('403: Forbidden: bot was blocked by the user');

      let result: boolean;

      beforeEach(async () => {
        mockTelegramBotUpdateService.ensureUserIsUpToDate.mockRejectedValue(blockedBotError);
        mockTelegramFailureHandler.canHandle.mockReturnValue(true);
        mockTelegramFailureHandler.handleFailure.mockResolvedValue(undefined);

        result = await service.sendSentryAlert(fakeUserId, alertInfo, 'en');
      });

      afterEach(() => {
        mockTelegramBotUpdateService.ensureUserIsUpToDate.mockResolvedValue(undefined);
      });

      it('should route the error to the failure handler', () => {
        expect(mockTelegramFailureHandler.handleFailure).toHaveBeenCalledWith(
          blockedBotError,
          fakeUserId
        );
      });

      it('should return false instead of throwing', () => {
        expect(result).toBe(false);
      });

      it('should not attempt to send the alert', () => {
        expect(mockTelegramBotService.sendMessage).not.toHaveBeenCalled();
      });
    });

    describe('When the rejection is not an Error instance', () => {
      let act: () => Promise<boolean>;

      beforeEach(() => {
        mockTelegramBotService.sendMessage.mockRejectedValue('403: Forbidden');
        act = () => service.sendSentryAlert(fakeUserId, alertInfo, 'en');
      });

      it('should propagate the original rejection unchanged', async () => {
        await expect(act()).rejects.toBe('403: Forbidden');
      });

      it('should not ask the failure handler to inspect it', async () => {
        await expect(act()).rejects.toBeDefined();
        expect(mockTelegramFailureHandler.canHandle).not.toHaveBeenCalled();
      });
    });

    describe('When the failure handler cannot handle the error', () => {
      it('should rethrow the error', async () => {
        const testError = new Error('Unknown error');

        mockTelegramBotService.sendMessage.mockRejectedValue(testError);
        mockTelegramFailureHandler.canHandle.mockReturnValue(false);

        await expect(service.sendSentryAlert(fakeUserId, alertInfo, 'en')).rejects.toThrow(testError);

        expect(mockTelegramFailureHandler.handleFailure).not.toHaveBeenCalled();
        expect(mockRetryManager.addToRetry).not.toHaveBeenCalled();
      });
    });

    describe('When the error is a retryable TelegramError', () => {
      it('should schedule a retry for 429 Too Many Requests and return false', async () => {
        const telegramError = new TelegramError({ error_code: 429, description: 'Too Many Requests' });

        mockTelegramBotService.sendMessage.mockRejectedValue(telegramError);

        const result = await service.sendSentryAlert(fakeUserId, alertInfo, 'en');

        expect(result).toBe(false);
        expect(mockRetryManager.addToRetry).toHaveBeenCalledWith(
          expect.any(Function),
          telegramError,
          expect.stringMatching(/^telegram-alert-user-123-\d+$/)
        );
      });

      it('should schedule a retry for 502 Bad Gateway and return false', async () => {
        const telegramError = new TelegramError({ error_code: 502, description: 'Bad Gateway' });

        mockTelegramBotService.sendMessage.mockRejectedValue(telegramError);

        const result = await service.sendSentryAlert(fakeUserId, alertInfo, 'en');

        expect(result).toBe(false);
        expect(mockRetryManager.addToRetry).toHaveBeenCalledTimes(1);
      });

      it('should rethrow the error when retry scheduling is disabled', async () => {
        const telegramError = new TelegramError({ error_code: 429, description: 'Too Many Requests' });

        mockTelegramBotService.sendMessage.mockRejectedValue(telegramError);

        await expect(service.sendSentryAlert(fakeUserId, alertInfo, 'en', undefined, false)).rejects.toThrow(telegramError);
        expect(mockRetryManager.addToRetry).not.toHaveBeenCalled();
      });
    });

    describe('When the error is a non-retryable TelegramError', () => {
      it('should throw the error', async () => {
        const telegramError = new TelegramError({ error_code: 400, description: 'Bad Request' });

        mockTelegramBotService.sendMessage.mockRejectedValue(telegramError);

        await expect(service.sendSentryAlert(fakeUserId, alertInfo, 'en')).rejects.toThrow(telegramError);

        expect(mockRetryManager.addToRetry).not.toHaveBeenCalled();
      });
    });

    describe('When the error is a retryable network error', () => {
      it('should schedule a retry for ETIMEDOUT and return false', async () => {
        const networkError = new Error('connect ETIMEDOUT 149.154.167.220:443');

        mockTelegramBotService.sendMessage.mockRejectedValue(networkError);

        const result = await service.sendSentryAlert(fakeUserId, alertInfo, 'en');

        expect(result).toBe(false);
        expect(mockRetryManager.addToRetry).toHaveBeenCalledWith(
          expect.any(Function),
          networkError,
          expect.stringMatching(/^telegram-alert-user-123-\d+$/)
        );
      });

      it('should schedule a retry for ECONNRESET and return false', async () => {
        const networkError = new Error('read ECONNRESET');

        mockTelegramBotService.sendMessage.mockRejectedValue(networkError);

        const result = await service.sendSentryAlert(fakeUserId, alertInfo, 'en');

        expect(result).toBe(false);
        expect(mockRetryManager.addToRetry).toHaveBeenCalledTimes(1);
      });
    });

    describe('When the Telegram request times out', () => {
      afterEach(() => {
        jest.useRealTimers();
      });

      it('should rethrow the timeout when retry scheduling is disabled', async () => {
        jest.useFakeTimers();
        mockTelegramBotService.sendMessage.mockImplementation(() => new Promise<boolean>(() => undefined));

        const result = service.sendSentryAlert(fakeUserId, alertInfo, 'en', undefined, false);
        const rejection = expect(result).rejects.toThrow('ETIMEDOUT: Telegram notification request timed out after 5000ms');
        await jest.advanceTimersByTimeAsync(10000);

        await rejection;
      });

      it('should abort every in-flight request when its timeout is reached', async () => {
        jest.useFakeTimers();
        const receivedSignals: Array<AbortSignal | undefined> = [];
        mockTelegramBotService.sendMessage.mockImplementation((
          _chatId: string,
          _message: string,
          _options: unknown,
          signal?: AbortSignal
        ) => {
          receivedSignals.push(signal);
          return new Promise<boolean>(() => undefined);
        });

        const result = service.sendSentryAlert(fakeUserId, alertInfo, 'en', undefined, false);
        const rejection = expect(result).rejects.toThrow('ETIMEDOUT: Telegram notification request timed out after 5000ms');
        await jest.advanceTimersByTimeAsync(10000);

        await rejection;
        expect(receivedSignals).toHaveLength(2);
        expect(receivedSignals.every((signal) => signal?.aborted)).toBe(true);
      });
    });
  });

  describe('The immediate retry of an alert send', () => {
    const retryAlertInfo = { vin: 'VIN_RETRY_TEST' };
    const buildNetworkError = (code: string): Error =>
      Object.assign(new Error('request to https://api.telegram.org/bot000000:FAKE/sendMessage failed, reason: '), {
        code,
        errno: code,
        name: 'FetchError',
        type: 'system',
      });

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('When the first attempt fails with a fast ETIMEDOUT and the second succeeds', () => {
      let result: boolean;

      beforeEach(async () => {
        mockTelegramBotService.sendMessage.mockRejectedValueOnce(buildNetworkError('ETIMEDOUT')).mockResolvedValueOnce(true);

        const pending = service.sendSentryAlert(fakeUserId, retryAlertInfo, 'en', undefined, false);
        await jest.advanceTimersByTimeAsync(0);
        result = await pending;
      });

      it('should retry once, immediately', () => {
        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledTimes(2);
      });

      it('should send the first attempt over the shared client and the retry over a fresh connection', () => {
        expect(mockTelegramBotService.sendMessage.mock.calls[0][4]).toBe(false);
        expect(mockTelegramBotService.sendMessage.mock.calls[1][4]).toBe(true);
      });

      it('should report the alert as delivered', () => {
        expect(result).toBe(true);
      });

      it('should not schedule a background retry', () => {
        expect(mockRetryManager.addToRetry).not.toHaveBeenCalled();
      });
    });

    describe('When the first attempt hangs on a stale connection until the 5s timeout', () => {
      let result: boolean;
      let warnSpy: jest.SpyInstance;
      let firstSignal: AbortSignal | undefined;

      beforeEach(async () => {
        warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        mockTelegramBotService.sendMessage
          .mockImplementationOnce((_chatId: string, _message: string, _options: unknown, signal?: AbortSignal) => {
            firstSignal = signal;
            return new Promise<boolean>(() => undefined);
          })
          .mockResolvedValueOnce(true);

        const pending = service.sendSentryAlert(fakeUserId, retryAlertInfo, 'en', undefined, false);
        await jest.advanceTimersByTimeAsync(5000);
        result = await pending;
      });

      afterEach(() => {
        warnSpy.mockRestore();
      });

      it('should abort the hung request', () => {
        expect(firstSignal?.aborted).toBe(true);
      });

      it('should retry once at once over a fresh connection and deliver the alert', () => {
        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledTimes(2);
        expect(mockTelegramBotService.sendMessage.mock.calls[1][4]).toBe(true);
        expect(result).toBe(true);
      });

      it('should warn that the retry may deliver a duplicate', () => {
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('(possible duplicate)'));
      });
    });

    describe('When the first attempt fails with an AggregateError from happy eyeballs', () => {
      it('should retry and deliver the alert', async () => {
        mockTelegramBotService.sendMessage
          .mockRejectedValueOnce(new AggregateError([Object.assign(new Error('connect ENETUNREACH'), { code: 'ENETUNREACH' })], ''))
          .mockResolvedValueOnce(true);

        const pending = service.sendSentryAlert(fakeUserId, retryAlertInfo, 'en', undefined, false);
        await jest.advanceTimersByTimeAsync(300);

        await expect(pending).resolves.toBe(true);
        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledTimes(2);
      });
    });

    describe('When Telegram answers with a 5xx and then succeeds', () => {
      it('should retry and deliver the alert', async () => {
        mockTelegramBotService.sendMessage
          .mockRejectedValueOnce(new TelegramError({ error_code: 502, description: 'Bad Gateway' }))
          .mockResolvedValueOnce(true);

        const pending = service.sendSentryAlert(fakeUserId, retryAlertInfo, 'en', undefined, false);
        await jest.advanceTimersByTimeAsync(300);

        await expect(pending).resolves.toBe(true);
      });
    });

    describe('When every attempt fails with ECONNRESET', () => {
      it('should retry only once on a fresh connection, to bound duplicates', async () => {
        mockTelegramBotService.sendMessage.mockRejectedValue(buildNetworkError('ECONNRESET'));

        const rejection = expect(service.sendSentryAlert(fakeUserId, retryAlertInfo, 'en', undefined, false)).rejects.toThrow('reason:');
        await jest.advanceTimersByTimeAsync(0);
        await rejection;
        await jest.advanceTimersByTimeAsync(5000);

        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledTimes(2);
      });
    });

    describe('When EPIPE is followed by a 5xx and then a success', () => {
      it('should use both retries and deliver the alert', async () => {
        mockTelegramBotService.sendMessage
          .mockRejectedValueOnce(buildNetworkError('EPIPE'))
          .mockRejectedValueOnce(new TelegramError({ error_code: 502, description: 'Bad Gateway' }))
          .mockResolvedValueOnce(true);

        const pending = service.sendSentryAlert(fakeUserId, retryAlertInfo, 'en', undefined, false);
        await jest.advanceTimersByTimeAsync(1000);

        await expect(pending).resolves.toBe(true);
        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledTimes(3);
      });
    });

    describe('When every attempt fails with ECONNREFUSED', () => {
      it('should make the first attempt and two backed-off retries only', async () => {
        mockTelegramBotService.sendMessage.mockRejectedValue(buildNetworkError('ECONNREFUSED'));

        const rejection = expect(service.sendSentryAlert(fakeUserId, retryAlertInfo, 'en', undefined, false)).rejects.toThrow('reason:');
        await jest.advanceTimersByTimeAsync(300);
        await jest.advanceTimersByTimeAsync(1000);
        await rejection;
        await jest.advanceTimersByTimeAsync(5000);

        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledTimes(3);
      });
    });

    describe('When Telegram rate-limits the request with a short retry_after', () => {
      it('should wait for retry_after before retrying', async () => {
        mockTelegramBotService.sendMessage
          .mockRejectedValueOnce(new TelegramError({ error_code: 429, description: 'Too Many Requests: retry after 2', parameters: { retry_after: 2 } }))
          .mockResolvedValueOnce(true);

        const pending = service.sendSentryAlert(fakeUserId, retryAlertInfo, 'en', undefined, false);
        await jest.advanceTimersByTimeAsync(1999);
        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledTimes(1);

        await jest.advanceTimersByTimeAsync(1);
        await expect(pending).resolves.toBe(true);
        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledTimes(2);
      });
    });

    describe('When Telegram rate-limits the request beyond the time budget', () => {
      it('should not retry immediately', async () => {
        const rateLimitError = new TelegramError({ error_code: 429, description: 'Too Many Requests: retry after 30', parameters: { retry_after: 30 } });
        mockTelegramBotService.sendMessage.mockRejectedValue(rateLimitError);

        await expect(service.sendSentryAlert(fakeUserId, retryAlertInfo, 'en', undefined, false)).rejects.toThrow(rateLimitError);
        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledTimes(1);
      });

      it('should leave the retry to the notification sweep instead of the in-memory retry manager', async () => {
        const rateLimitError = new TelegramError({ error_code: 429, description: 'Too Many Requests: retry after 30', parameters: { retry_after: 30 } });
        mockTelegramBotService.sendMessage.mockRejectedValue(rateLimitError);

        await Promise.allSettled([service.sendSentryAlert(fakeUserId, retryAlertInfo, 'en', undefined, false)]);

        expect(mockRetryManager.addToRetry).not.toHaveBeenCalled();
      });
    });

    describe('When Telegram rejects the request with a client error', () => {
      it.each([
        [400, 'Bad Request: message text is empty'],
        [403, 'Forbidden: bot was blocked by the user'],
      ])('should never retry a %i', async (errorCode, description) => {
        const clientError = new TelegramError({ error_code: errorCode, description });
        mockTelegramBotService.sendMessage.mockRejectedValue(clientError);

        await expect(service.sendSentryAlert(fakeUserId, retryAlertInfo, 'en', undefined, false)).rejects.toThrow(clientError);
        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledTimes(1);
      });
    });

    describe('When both attempts hang until their timeout', () => {
      it('should give up after one retry, within the send budget', async () => {
        mockTelegramBotService.sendMessage.mockImplementation(() => new Promise<boolean>(() => undefined));

        const rejection = expect(service.sendSentryAlert(fakeUserId, retryAlertInfo, 'en', undefined, false)).rejects.toThrow('ETIMEDOUT');
        await jest.advanceTimersByTimeAsync(10000);
        await rejection;
        await jest.advanceTimersByTimeAsync(5000);

        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledTimes(2);
      });
    });

    describe('When an error arrives too close to the send budget', () => {
      it('should not retry past the budget', async () => {
        mockTelegramBotService.sendMessage
          .mockImplementationOnce(() => new Promise<boolean>((_, reject) => setTimeout(() => reject(buildNetworkError('ECONNRESET')), 4_900)))
          .mockImplementationOnce(() => new Promise<boolean>((_, reject) => setTimeout(() => reject(buildNetworkError('ECONNREFUSED')), 4_900)));

        const rejection = expect(service.sendSentryAlert(fakeUserId, retryAlertInfo, 'en', undefined, false)).rejects.toThrow('reason:');
        await jest.advanceTimersByTimeAsync(9_800);
        await rejection;

        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledTimes(2);
      });
    });

    describe('When the final failure is logged', () => {
      it('should log the error code instead of an empty object', async () => {
        const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        mockTelegramBotService.sendMessage.mockRejectedValue(buildNetworkError('ETIMEDOUT'));

        const rejection = expect(service.sendSentryAlert(fakeUserId, retryAlertInfo, 'en', undefined, false)).rejects.toThrow('reason:');
        await jest.advanceTimersByTimeAsync(0);
        await rejection;

        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('code=ETIMEDOUT'));
        expect(errorSpy.mock.calls.flat().join(' ')).not.toContain('FAKE');
        errorSpy.mockRestore();
      });
    });
  });

  describe('The sendCounterMeasureNotice() method', () => {
    const alertInfo = { display_name: 'My Tesla', vin: 'XP7YGCER1TB919128' };
    const counterMeasures = [CounterMeasure.Honk, CounterMeasure.AutoSentry];

    describe('When the user can be reached', () => {
      let result: TelegramDeliveryResult;

      beforeEach(async () => {
        mockTelegramBotService.sendMessage.mockResolvedValue(true);

        result = await service.sendCounterMeasureNotice(fakeUserId, alertInfo, 'en', counterMeasures);
      });

      it('should send the notice to the user chat', () => {
        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledWith(fakeChatId, expect.stringContaining('RESPONSE TRIGGERED'), undefined, expect.any(AbortSignal), false);
      });

      it('should list the counter-measures that went off', () => {
        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledWith(
          fakeChatId,
          expect.stringContaining('The horn sounded. Sentry Mode was turned on.'),
          undefined,
          expect.any(AbortSignal),
          false
        );
      });

      it('should report the notice as sent', () => {
        expect(result).toStrictEqual({ isDelivered: true });
      });
    });

    describe('When the user muted notifications', () => {
      let result: TelegramDeliveryResult;

      beforeEach(async () => {
        mockTelegramMuteService.checkIsNotificationMuted.mockResolvedValue(true);

        result = await service.sendCounterMeasureNotice(fakeUserId, alertInfo, 'en', counterMeasures);
      });

      it('should not send anything', () => {
        expect(mockTelegramBotService.sendMessage).not.toHaveBeenCalled();
      });

      it('should report that nothing was sent', () => {
        expect(result).toStrictEqual({ isDelivered: false });
      });
    });

    describe('When the user has no linked chat', () => {
      beforeEach(async () => {
        mockTelegramContextService.getChatIdFromUserId.mockResolvedValue(null);

        await service.sendCounterMeasureNotice(fakeUserId, alertInfo, 'en', counterMeasures);
      });

      it('should not send anything', () => {
        expect(mockTelegramBotService.sendMessage).not.toHaveBeenCalled();
      });
    });

    describe('When the user blocked the bot', () => {
      const blockedBotError = new Error('403: Forbidden: bot was blocked by the user');
      let result: TelegramDeliveryResult;

      beforeEach(async () => {
        mockTelegramBotService.sendMessage.mockRejectedValue(blockedBotError);
        mockTelegramFailureHandler.canHandle.mockReturnValue(true);

        result = await service.sendCounterMeasureNotice(fakeUserId, alertInfo, 'en', counterMeasures);
      });

      it('should route the error to the failure handler', () => {
        expect(mockTelegramFailureHandler.handleFailure).toHaveBeenCalledWith(blockedBotError, fakeUserId);
      });

      it('should report that nothing was sent', () => {
        expect(result).toStrictEqual({ isDelivered: false });
      });
    });

    describe('When Telegram rate-limits the bot', () => {
      let result: TelegramDeliveryResult;

      beforeEach(async () => {
        mockTelegramBotService.sendMessage.mockRejectedValue(new TelegramError({ error_code: 429, description: 'Too Many Requests' }));

        result = await service.sendCounterMeasureNotice(fakeUserId, alertInfo, 'en', counterMeasures);
      });

      it('should schedule a retry', () => {
        expect(mockRetryManager.addToRetry).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(TelegramError),
          expect.stringContaining(`telegram-counter-measure-${fakeUserId}`)
        );
      });

      it('should report that nothing was sent yet', () => {
        expect(result).toStrictEqual({ isDelivered: false });
      });
    });

    describe('When Telegram rejects the message for good', () => {
      const badRequestError = new TelegramError({ error_code: 400, description: 'Bad Request' });
      let act: () => Promise<boolean>;

      beforeEach(() => {
        mockTelegramBotService.sendMessage.mockRejectedValue(badRequestError);
        act = async () => await service.sendCounterMeasureNotice(fakeUserId, alertInfo, 'en', counterMeasures);
      });

      it('should throw the error', async () => {
        await expect(act()).rejects.toThrow(badRequestError);
      });

      it('should not schedule a retry', async () => {
        await act().catch(() => undefined);

        expect(mockRetryManager.addToRetry).not.toHaveBeenCalled();
      });
    });
  });

  describe('The sendBreakInAlert() method', () => {
    const alertInfo = { vin: 'TEST123456' };

    describe('When the bot UI update fails because the bot is blocked', () => {
      const blockedBotError = new Error('403: Forbidden: bot was blocked by the user');

      let result: boolean;

      beforeEach(async () => {
        mockTelegramBotUpdateService.ensureUserIsUpToDate.mockRejectedValue(blockedBotError);
        mockTelegramFailureHandler.canHandle.mockReturnValue(true);
        mockTelegramFailureHandler.handleFailure.mockResolvedValue(undefined);

        result = await service.sendBreakInAlert(fakeUserId, alertInfo, 'en');
      });

      afterEach(() => {
        mockTelegramBotUpdateService.ensureUserIsUpToDate.mockResolvedValue(undefined);
      });

      it('should route the error to the failure handler', () => {
        expect(mockTelegramFailureHandler.handleFailure).toHaveBeenCalledWith(
          blockedBotError,
          fakeUserId
        );
      });

      it('should return false instead of throwing', () => {
        expect(result).toBe(false);
      });
    });

    describe('When the alert is sent', () => {
      beforeEach(() => {
        mockTelegramBotService.sendMessage.mockResolvedValue(true);
      });

      it('should return true', async () => {
        const result = await service.sendBreakInAlert(fakeUserId, alertInfo, 'en');

        expect(result).toBe(true);
      });
    });

    describe('When the alert is delivered hours after it was detected', () => {
      it('should tell the user that the alert is late', async () => {
        mockTelegramBotService.sendMessage.mockResolvedValue(true);

        await service.sendBreakInAlert(fakeUserId, { ...alertInfo, detectedAt: new Date(Date.now() - 3 * 3_600_000) }, 'en');

        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledWith(
          fakeChatId,
          expect.stringContaining('Delayed alert'),
          undefined,
          expect.any(AbortSignal),
          false
        );
      });
    });
  });

  describe('The onModuleDestroy() method', () => {
    it('should stop the retry manager', () => {
      service.onModuleDestroy();

      expect(mockRetryManager.stop).toHaveBeenCalledTimes(1);
    });
  });
});
