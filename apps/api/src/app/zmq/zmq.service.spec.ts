import { Test, TestingModule } from '@nestjs/testing';
import { ZmqService, TelemetryMessage } from './zmq.service';
import { TelegramService } from '../telegram/telegram.service';

// Mock zeromq
jest.mock('zeromq', () => ({
  Subscriber: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    [Symbol.asyncIterator]: jest.fn().mockReturnValue({
      [Symbol.asyncIterator]: () => ({
        next: () => Promise.resolve({ value: 'test', done: true })
      })
    }),
  })),
}));

// Mock TelegramService
const mockTelegramService = {
  sendSentryAlert: jest.fn().mockResolvedValue(undefined),
  sendTelegramMessage: jest.fn().mockResolvedValue(undefined),
};

describe('ZmqService', () => {
  let service: ZmqService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZmqService,
        {
          provide: TelegramService,
          useValue: mockTelegramService,
        },
      ],
    }).compile();

    service = module.get<ZmqService>(ZmqService);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env.ZMQ_ENDPOINT = 'tcp://test:1234';
    process.env.DEBUG_MESSAGES = 'false';
  });

  afterEach(() => {
    delete process.env.ZMQ_ENDPOINT;
    delete process.env.DEBUG_MESSAGES;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should start listening when module initializes', async () => {
      const startListeningSpy = jest.spyOn(service as any, 'startListening').mockResolvedValue();

      await service.onModuleInit();

      expect(startListeningSpy).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should stop listening when module destroys', async () => {
      const stopListeningSpy = jest.spyOn(service as any, 'stopListening').mockResolvedValue();

      await service.onModuleDestroy();

      expect(stopListeningSpy).toHaveBeenCalled();
    });
  });

  describe('processTelemetryMessage', () => {
    it('should send sentry alert when SentryMode is Aware', async () => {
      const message: TelemetryMessage = {
        data: [
          {
            key: 'SentryMode',
            value: { stringValue: 'Aware' }
          },
          {
            key: 'CenterDisplay',
            value: { displayStateValue: 'DisplayStateSentry' }
          }
        ],
        createdAt: '2025-01-21T10:00:00.000Z',
        vin: 'TEST_VIN_123',
        isResend: false
      };

      await (service as any).processTelemetryMessage(message);

      expect(mockTelegramService.sendSentryAlert).toHaveBeenCalledWith({
        vin: 'TEST_VIN_123',
        timestamp: '2025-01-21T10:00:00.000Z',
        sentryMode: 'Aware',
        centerDisplay: 'DisplayStateSentry',
        location: 'Non disponible',
        batteryLevel: 'N/A',
        vehicleSpeed: '0',
        alarmState: 'Active'
      });
    });

    it('should not send alert when SentryMode is not Aware', async () => {
      const message: TelemetryMessage = {
        data: [
          {
            key: 'SentryMode',
            value: { stringValue: 'Off' }
          }
        ],
        createdAt: '2025-01-21T10:00:00.000Z',
        vin: 'TEST_VIN_123',
        isResend: false
      };

      await (service as any).processTelemetryMessage(message);

      expect(mockTelegramService.sendSentryAlert).not.toHaveBeenCalled();
    });

    it('should handle missing SentryMode data', async () => {
      const message: TelemetryMessage = {
        data: [
          {
            key: 'OtherData',
            value: { stringValue: 'SomeValue' }
          }
        ],
        createdAt: '2025-01-21T10:00:00.000Z',
        vin: 'TEST_VIN_123',
        isResend: false
      };

      await (service as any).processTelemetryMessage(message);

      expect(mockTelegramService.sendSentryAlert).not.toHaveBeenCalled();
    });

    it('should handle processing errors', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      mockTelegramService.sendSentryAlert.mockRejectedValue(new Error('Telegram error'));

      const message: TelemetryMessage = {
        data: [
          {
            key: 'SentryMode',
            value: { stringValue: 'Aware' }
          }
        ],
        createdAt: '2025-01-21T10:00:00.000Z',
        vin: 'TEST_VIN_123',
        isResend: false
      };

      await (service as any).processTelemetryMessage(message);

      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });

  describe('debug messages', () => {
    it('should not send debug message when DEBUG_MESSAGES is false', async () => {
      process.env.DEBUG_MESSAGES = 'false';
      
      const message: TelemetryMessage = {
        data: [],
        createdAt: '2025-01-21T10:00:00.000Z',
        vin: 'TEST_VIN_123',
        isResend: false
      };

      await (service as any).processTelemetryMessage(message);

      expect(mockTelegramService.sendTelegramMessage).not.toHaveBeenCalled();
    });
  });
});