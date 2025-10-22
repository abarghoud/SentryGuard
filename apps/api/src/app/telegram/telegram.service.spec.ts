import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from './telegram.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TelegramService', () => {
  let service: TelegramService;

  beforeEach(async () => {
    // Set up environment variables before creating the module
    process.env.TELEGRAM_BOT_TOKEN = 'test_bot_token';
    process.env.TELEGRAM_CHAT_ID = 'test_chat_id';
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramService],
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
        alarmState: 'Active'
      };

      mockedAxios.post.mockResolvedValueOnce({ data: { ok: true } });

      await service.sendSentryAlert(alertInfo);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest_bot_token/sendMessage',
        expect.objectContaining({
          chat_id: 'test_chat_id',
          text: expect.stringContaining('ALERTE SENTINEL TESLA'),
          parse_mode: 'HTML'
        })
      );
    });

    it('should handle axios errors gracefully', async () => {
      const alertInfo = {
        vin: 'TEST_VIN_123',
        timestamp: '2025-01-21T10:00:00.000Z'
      };

      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await service.sendSentryAlert(alertInfo);

      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });

  describe('sendTelegramMessage', () => {
    it('should send a telegram message successfully', async () => {
      const message = 'Test message';

      mockedAxios.post.mockResolvedValueOnce({ data: { ok: true } });

      await service.sendTelegramMessage(message);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest_bot_token/sendMessage',
        {
          chat_id: 'test_chat_id',
          text: message,
          parse_mode: 'HTML'
        }
      );
    });

    it('should handle axios errors gracefully', async () => {
      const message = 'Test message';
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await service.sendTelegramMessage(message);

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
        alarmState: 'Active'
      };

      mockedAxios.post.mockResolvedValueOnce({ data: { ok: true } });

      await service.sendSentryAlert(alertInfo);

      const callArgs = mockedAxios.post.mock.calls[0][1];
      expect(callArgs.text).toContain('ALERTE SENTINEL TESLA');
      expect(callArgs.text).toContain('TEST_VIN_123');
      expect(callArgs.text).toContain('Test Location');
      expect(callArgs.text).toContain('85%');
      expect(callArgs.text).toContain('Aware');
    });

    it('should handle missing optional fields', async () => {
      const alertInfo = {
        vin: 'TEST_VIN_123',
        timestamp: '2025-01-21T10:00:00.000Z'
      };

      mockedAxios.post.mockResolvedValueOnce({ data: { ok: true } });

      await service.sendSentryAlert(alertInfo);

      const callArgs = mockedAxios.post.mock.calls[0][1];
      expect(callArgs.text).toContain('Non disponible');
      expect(callArgs.text).toContain('N/A');
    });
  });
});
