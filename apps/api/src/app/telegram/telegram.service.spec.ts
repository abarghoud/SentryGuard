import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { TelegramService } from './telegram.service';
import { TelegramBotService } from './telegram-bot.service';
import { UserLanguageService } from '../user/user-language.service';
import { telegramFailureHandler } from './interfaces/telegram-failure-handler.interface';
import type { ITelegramFailureHandler } from './interfaces/telegram-failure-handler.interface';

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

describe('TelegramService', () => {
  let service: TelegramService;
  let telegramBotService: TelegramBotService;
  let userLanguageService: UserLanguageService;

  const mockTelegramBotService: MockProxy<TelegramBotService> = mock<TelegramBotService>();
  const mockUserLanguageService: MockProxy<UserLanguageService> = mock<UserLanguageService>();
  const mockTelegramFailureHandler: MockProxy<ITelegramFailureHandler> = mock<ITelegramFailureHandler>();

  beforeEach(async () => {
    mockTelegramFailureHandler.canHandle.mockImplementation((error: Error) => {
      return error.message.toLowerCase().includes('bot was blocked by the user');
    });
    mockTelegramFailureHandler.handleFailure.mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        {
          provide: TelegramBotService,
          useValue: mockTelegramBotService,
        },
        {
          provide: UserLanguageService,
          useValue: mockUserLanguageService,
        },
        {
          provide: telegramFailureHandler,
          useValue: mockTelegramFailureHandler,
        },
      ],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
    telegramBotService = module.get<TelegramBotService>(TelegramBotService);
    userLanguageService = module.get<UserLanguageService>(UserLanguageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendSentryAlert', () => {
    it('should send alert in English with VIN only', async () => {
      const alertInfo = {
        vin: 'TEST123456',
      };

      mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
      mockTelegramBotService.sendMessageToUser.mockResolvedValue(true);

      await service.sendSentryAlert('user-123', alertInfo, 'en', undefined);

      expect(userLanguageService.getUserLanguage).not.toHaveBeenCalled();
      expect(telegramBotService.sendMessageToUser).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('TESLA SENTRY ALERT'),
        undefined
      );
      expect(telegramBotService.sendMessageToUser).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('Vehicle'),
        undefined
      );
      expect(telegramBotService.sendMessageToUser).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('TEST123456'),
        undefined
      );
      expect(telegramBotService.sendMessageToUser).not.toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('(TEST123456)'),
        undefined
      );
    });

    it('should send alert in French with display name', async () => {
      const alertInfo = {
        vin: 'TEST123456',
        display_name: 'Mon Tesla',
      };

      mockUserLanguageService.getUserLanguage.mockResolvedValue('fr');
      mockTelegramBotService.sendMessageToUser.mockResolvedValue(true);

      await service.sendSentryAlert('user-123', alertInfo, 'fr', undefined);

      expect(userLanguageService.getUserLanguage).not.toHaveBeenCalled();
      expect(telegramBotService.sendMessageToUser).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('ALERTE SENTRY TESLA'),
        undefined
      );
      expect(telegramBotService.sendMessageToUser).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('Véhicule'),
        undefined
      );
      expect(telegramBotService.sendMessageToUser).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('Mon Tesla'),
        undefined
      );
      expect(telegramBotService.sendMessageToUser).not.toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('TEST123456'),
        undefined
      );
    });

    it('should use provided language without DB call', async () => {
      const alertInfo = {
        vin: 'TEST123456',
      };

      mockTelegramBotService.sendMessageToUser.mockResolvedValue(true);

      await service.sendSentryAlert('user-123', alertInfo, 'fr', undefined);

      expect(userLanguageService.getUserLanguage).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const alertInfo = {
        vin: 'TEST123456',
      };

      mockTelegramBotService.sendMessageToUser.mockRejectedValue(
        new Error('Forbidden: bot was blocked by the user')
      );

      const result = await service.sendSentryAlert('user-123', alertInfo, 'en', undefined);

      expect(result).toBe(false);
    });

    describe('When failure handler can handle the error', () => {
      it('should call handleFailure and return false', async () => {
        const alertInfo = {
          vin: 'TEST123456',
        };
        const testError = new Error('Forbidden: bot was blocked by the user');

        mockTelegramBotService.sendMessageToUser.mockRejectedValue(testError);
        mockTelegramFailureHandler.canHandle.mockReturnValue(true);
        mockTelegramFailureHandler.handleFailure.mockResolvedValue(undefined);

        const result = await service.sendSentryAlert('user-123', alertInfo, 'en', undefined);

        expect(mockTelegramFailureHandler.canHandle).toHaveBeenCalledWith(testError);
        expect(mockTelegramFailureHandler.handleFailure).toHaveBeenCalledWith(testError, 'user-123');
        expect(result).toBe(false);
      });
    });

    describe('When failure handler cannot handle the error', () => {
      it('should rethrow the error', async () => {
        const alertInfo = {
          vin: 'TEST123456',
        };
        const testError = new Error('Network error');

        mockTelegramBotService.sendMessageToUser.mockRejectedValue(testError);
        mockTelegramFailureHandler.canHandle.mockReturnValue(false);

        await expect(service.sendSentryAlert('user-123', alertInfo, 'en', undefined)).rejects.toThrow(testError);

        expect(mockTelegramFailureHandler.canHandle).toHaveBeenCalledWith(testError);
        expect(mockTelegramFailureHandler.handleFailure).not.toHaveBeenCalled();
      });
    });
  });
});
