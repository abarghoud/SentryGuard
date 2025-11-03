import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from './telegram.service';
import { TelegramBotService } from './telegram-bot.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock TelegramBotService
const mockTelegramBotService = {
  sendMessageToUser: jest.fn().mockResolvedValue(true),
};

describe('TelegramService', () => {
  let service: TelegramService;

  beforeEach(async () => {
    // Set up environment variables before creating the module
    process.env.TELEGRAM_BOT_TOKEN = 'test_bot_token';
    process.env.TELEGRAM_CHAT_ID = 'test_chat_id';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        {
          provide: TelegramBotService,
          useValue: mockTelegramBotService,
        },
      ],
    }).compile();

    service = module.get<TelegramService>(TelegramService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendSentryAlert', () => {
    it('should send a sentry alert successfully', async () => {
      const alertInfo = {
        vin: 'TEST_VIN_123',
        timestamp: '2025-01-21T10:00:00.000Z',
        sentryMode: 'Aware',
        centerDisplay: 'DisplayStateSentry',
        location: 'Test Location',
        batteryLevel: '85',
        vehicleSpeed: '0',
        alarmState: 'Active',
      };

      mockedAxios.post.mockResolvedValueOnce({ data: { ok: true } });

      await service.sendSentryAlert('test-user-id', alertInfo);

      expect(mockTelegramBotService.sendMessageToUser).toHaveBeenCalledWith(
        'test-user-id',
        expect.stringContaining('ALERTE SENTINEL TESLA')
      );
    });

    it('should handle axios errors gracefully', async () => {
      const alertInfo = {
        vin: 'TEST_VIN_123',
        timestamp: '2025-01-21T10:00:00.000Z',
      };

      const loggerSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await service.sendSentryAlert(alertInfo);

      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });

  describe('sendTelegramMessage', () => {
    it('should send a telegram message successfully', async () => {
      const message = 'Test message';

      mockTelegramBotService.sendMessageToUser.mockResolvedValue(true);

      await service.sendTelegramMessage('test-user-id', message);

      expect(mockTelegramBotService.sendMessageToUser).toHaveBeenCalledWith(
        'test-user-id',
        'Test message'
      );
    });

    it('should handle errors gracefully', async () => {
      const message = 'Test message';
      const loggerSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();
      mockTelegramBotService.sendMessageToUser.mockRejectedValue(
        new Error('Network error')
      );

      await service.sendTelegramMessage('test-user-id', message);

      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });

  describe('formatSentryAlertMessage', () => {
    it('should format sentry alert message correctly', async () => {
      const alertInfo = {
        vin: 'TEST_VIN_123',
        timestamp: '2025-01-21T10:00:00.000Z',
        sentryMode: 'Aware',
        centerDisplay: 'DisplayStateSentry',
        location: 'Test Location',
        batteryLevel: '85',
        vehicleSpeed: '0',
        alarmState: 'Active',
      };

      mockTelegramBotService.sendMessageToUser.mockResolvedValue(true);

      await service.sendSentryAlert('test-user-id', alertInfo);

      const callArgs =
        mockTelegramBotService.sendMessageToUser.mock.calls[0][1];
      expect(callArgs).toContain('ALERTE SENTINEL TESLA');
      expect(callArgs).toContain('TEST_VIN_123');
      expect(callArgs).toContain('Test Location');
      expect(callArgs).toContain('85%');
      expect(callArgs).toContain('Aware');
    });

    it('should handle missing optional fields', async () => {
      const alertInfo = {
        vin: 'TEST_VIN_123',
        timestamp: '2025-01-21T10:00:00.000Z',
      };

      mockTelegramBotService.sendMessageToUser.mockResolvedValue(true);

      await service.sendSentryAlert('test-user-id', alertInfo);

      const callArgs =
        mockTelegramBotService.sendMessageToUser.mock.calls[0][1];
      expect(callArgs).toContain('Non disponible');
      expect(callArgs).toContain('N/A');
    });
  });
});
