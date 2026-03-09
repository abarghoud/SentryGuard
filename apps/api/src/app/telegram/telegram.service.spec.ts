import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { TelegramError } from 'telegraf';
import { TelegramService } from './telegram.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramMuteService } from './telegram-mute.service';
import { TelegramContextService } from './telegram-context.service';
import { TelegramBotUpdateService } from './telegram-bot-update.service';
import { telegramFailureHandler } from './interfaces/telegram-failure-handler.interface';
import type { ITelegramFailureHandler } from './interfaces/telegram-failure-handler.interface';
import { telegramRetryManager } from './telegram-retry-manager.token';
import { RetryManager } from '../shared/retry-manager.service';

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
          undefined
        );
      });

      it('should include the VIN in the message', async () => {
        await service.sendSentryAlert(fakeUserId, alertInfo, 'en');

        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledWith(
          fakeChatId,
          expect.stringContaining('TEST123456'),
          undefined
        );
      });

      it('should call ensureUserIsUpToDate before sending', async () => {
        await service.sendSentryAlert(fakeUserId, alertInfo, 'en');

        expect(mockTelegramBotUpdateService.ensureUserIsUpToDate).toHaveBeenCalledWith(
          fakeUserId,
          fakeChatId,
          'en'
        );
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
          undefined
        );
      });

      it('should display the display_name instead of VIN', async () => {
        await service.sendSentryAlert(fakeUserId, frAlertInfo, 'fr');

        expect(mockTelegramBotService.sendMessage).toHaveBeenCalledWith(
          fakeChatId,
          expect.stringContaining('Mon Tesla'),
          undefined
        );
      });

      it('should not include the VIN when display_name is provided', async () => {
        await service.sendSentryAlert(fakeUserId, frAlertInfo, 'fr');

        expect(mockTelegramBotService.sendMessage).not.toHaveBeenCalledWith(
          fakeChatId,
          expect.stringContaining('TEST123456'),
          undefined
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
  });

  describe('The onModuleDestroy() method', () => {
    it('should stop the retry manager', () => {
      service.onModuleDestroy();

      expect(mockRetryManager.stop).toHaveBeenCalledTimes(1);
    });
  });
});