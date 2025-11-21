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

      await service.sendSentryAlert('user-123', alertInfo);

      expect(userLanguageService.getUserLanguage).toHaveBeenCalledWith(
        'user-123'
      );
      expect(telegramBotService.sendMessageToUser).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('TESLA SENTRY ALERT')
      );
      expect(telegramBotService.sendMessageToUser).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('Vehicle')
      );
      expect(telegramBotService.sendMessageToUser).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('TEST123456')
      );
      expect(telegramBotService.sendMessageToUser).not.toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('(TEST123456)')
      );
    });

    it('should send alert in French with display name', async () => {
      const alertInfo = {
        vin: 'TEST123456',
        display_name: 'Mon Tesla',
      };

      mockUserLanguageService.getUserLanguage.mockResolvedValue('fr');
      mockTelegramBotService.sendMessageToUser.mockResolvedValue(true);

      await service.sendSentryAlert('user-123', alertInfo);

      expect(userLanguageService.getUserLanguage).toHaveBeenCalledWith(
        'user-123'
      );
      expect(telegramBotService.sendMessageToUser).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('ALERTE SENTRY TESLA')
      );
      expect(telegramBotService.sendMessageToUser).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('Véhicule')
      );
      expect(telegramBotService.sendMessageToUser).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('Mon Tesla')
      );
      expect(telegramBotService.sendMessageToUser).not.toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('TEST123456')
      );
    });

    it('should handle errors gracefully', async () => {
      const alertInfo = {
        vin: 'TEST123456',
      };

      mockUserLanguageService.getUserLanguage.mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.sendSentryAlert('user-123', alertInfo);

      expect(result).toBe(false);
    });
  });

  describe('sendTelegramMessage', () => {
    it('should send custom message successfully', async () => {
      mockTelegramBotService.sendMessageToUser.mockResolvedValue(true);

      const result = await service.sendTelegramMessage(
        'user-123',
        'Custom message'
      );

      expect(result).toBe(true);
      expect(telegramBotService.sendMessageToUser).toHaveBeenCalledWith(
        'user-123',
        'Custom message'
      );
    });

    it('should return false when bot service fails', async () => {
      mockTelegramBotService.sendMessageToUser.mockResolvedValue(false);

      const result = await service.sendTelegramMessage(
        'user-123',
        'Custom message'
      );

      expect(result).toBe(false);
    });
  });
});
