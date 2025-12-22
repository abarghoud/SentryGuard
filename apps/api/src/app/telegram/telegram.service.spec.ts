import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from './telegram.service';
import { TelegramBotService } from './telegram-bot.service';
import { UserLanguageService } from '../user/user-language.service';

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

  const mockTelegramBotService = {
    sendMessageToUser: jest.fn(),
  };

  const mockUserLanguageService = {
    getUserLanguage: jest.fn(),
  };

  beforeEach(async () => {
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
        new Error('Telegram error')
      );

      const result = await service.sendSentryAlert('user-123', alertInfo, 'en', undefined);

      expect(result).toBe(false);
    });
  });
});
