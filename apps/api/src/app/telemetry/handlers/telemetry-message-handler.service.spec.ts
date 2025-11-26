import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TelemetryMessageHandlerService } from './telemetry-message-handler.service';
import { TelegramService } from '../../telegram/telegram.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { User } from '../../../entities/user.entity';
import { TelemetryEventHandler, TelemetryEventHandlerSymbol } from '../interfaces/telemetry-event-handler.interface';
import { mock } from 'jest-mock-extended';
import { Repository } from 'typeorm';

const mockTelegramService = mock<TelegramService>();
const mockVehicleRepository = mock<Repository<Vehicle>>();
const mockUserRepository = mock<Repository<User>>();
const mockEventHandler1 = mock<TelemetryEventHandler>();
const mockEventHandler2 = mock<TelemetryEventHandler>();

describe('The TelemetryMessageHandlerService class', () => {
  let service: TelemetryMessageHandlerService;

  beforeEach(async () => {
    mockEventHandler1.handle.mockResolvedValue(undefined);
    mockEventHandler2.handle.mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryMessageHandlerService,
        {
          provide: TelegramService,
          useValue: mockTelegramService,
        },
        {
          provide: getRepositoryToken(Vehicle),
          useValue: mockVehicleRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: TelemetryEventHandlerSymbol,
          useValue: [mockEventHandler1, mockEventHandler2],
        },
      ],
    }).compile();

    service = module.get<TelemetryMessageHandlerService>(TelemetryMessageHandlerService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('The handleMessage method', () => {
    it('should parse telemetry message and dispatch to handlers', async () => {
      const telemetryMessage = {
        data: [
          { key: 'SentryMode', value: { stringValue: 'Aware' } },
          { key: 'Speed', value: { stringValue: '50' } }
        ],
        createdAt: '2025-01-21T10:00:00.000Z',
        vin: 'TEST_VIN_123',
        isResend: false,
      };

      const message = {
        offset: '0',
        value: Buffer.from(JSON.stringify(telemetryMessage)),
        key: null,
        timestamp: '1234567890',
        attributes: 0,
        headers: {},
      };

      const commitMock = jest.fn().mockResolvedValue(undefined);

      await service.handleMessage(message, commitMock);

      expect(mockEventHandler1.handle).toHaveBeenCalledWith(telemetryMessage);
      expect(mockEventHandler2.handle).toHaveBeenCalledWith(telemetryMessage);
      expect(commitMock).toHaveBeenCalledWith();
    });

    it('should handle empty message content', async () => {
      const message = {
        offset: '0',
        value: null,
        key: null,
        timestamp: '1234567890',
        attributes: 0,
        headers: {},
      };

      const commitMock = jest.fn().mockResolvedValue(undefined);

      await service.handleMessage(message, commitMock);

      expect(mockEventHandler1.handle).not.toHaveBeenCalled();
      expect(mockEventHandler2.handle).not.toHaveBeenCalled();
      expect(commitMock).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON', async () => {
      const message = {
        offset: '0',
        value: Buffer.from('invalid json'),
        key: null,
        timestamp: '1234567890',
        attributes: 0,
        headers: {},
      };

      const commitMock = jest.fn().mockResolvedValue(undefined);

      await expect(service.handleMessage(message, commitMock)).rejects.toThrow();

      expect(mockEventHandler1.handle).not.toHaveBeenCalled();
      expect(mockEventHandler2.handle).not.toHaveBeenCalled();
      expect(commitMock).not.toHaveBeenCalled();
    });

    it('should handle handler errors', async () => {
      mockEventHandler1.handle.mockRejectedValue(new Error('Handler error'));

      const telemetryMessage = {
        data: [{ key: 'SentryMode', value: { stringValue: 'Aware' } }],
        createdAt: '2025-01-21T10:00:00.000Z',
        vin: 'TEST_VIN_123',
        isResend: false,
      };

      const message = {
        offset: '0',
        value: Buffer.from(JSON.stringify(telemetryMessage)),
        key: null,
        timestamp: '1234567890',
        attributes: 0,
        headers: {},
      };

      const commitMock = jest.fn().mockResolvedValue(undefined);

      await expect(service.handleMessage(message, commitMock)).rejects.toThrow('1 out of 2 handlers failed');

      expect(mockEventHandler1.handle).toHaveBeenCalledWith(telemetryMessage);
      expect(mockEventHandler2.handle).toHaveBeenCalledWith(telemetryMessage);
      expect(commitMock).not.toHaveBeenCalled();
    });

    it('should execute all handlers even when some fail with Promise.allSettled', async () => {
      mockEventHandler1.handle.mockRejectedValue(new Error('Handler 1 failed'));
      mockEventHandler2.handle.mockResolvedValue(undefined);

      const telemetryMessage = {
        data: [{ key: 'SentryMode', value: { stringValue: 'Aware' } }],
        createdAt: '2025-01-21T10:00:00.000Z',
        vin: 'TEST_VIN_123',
        isResend: false,
      };

      const message = {
        offset: '0',
        value: Buffer.from(JSON.stringify(telemetryMessage)),
        key: null,
        timestamp: '1234567890',
        attributes: 0,
        headers: {},
      };

      const commitMock = jest.fn().mockResolvedValue(undefined);

      await expect(service.handleMessage(message, commitMock)).rejects.toThrow('1 out of 2 handlers failed');

      expect(mockEventHandler1.handle).toHaveBeenCalledWith(telemetryMessage);
      expect(mockEventHandler2.handle).toHaveBeenCalledWith(telemetryMessage);
      expect(commitMock).not.toHaveBeenCalled();
    });

    it('should handle multiple handler failures', async () => {
      const error1 = new Error('Handler 1 failed');
      const error2 = new Error('Handler 2 failed');
      mockEventHandler1.handle.mockRejectedValue(error1);
      mockEventHandler2.handle.mockRejectedValue(error2);

      const telemetryMessage = {
        data: [{ key: 'SentryMode', value: { stringValue: 'Aware' } }],
        createdAt: '2025-01-21T10:00:00.000Z',
        vin: 'TEST_VIN_123',
        isResend: false,
      };

      const message = {
        offset: '0',
        value: Buffer.from(JSON.stringify(telemetryMessage)),
        key: null,
        timestamp: '1234567890',
        attributes: 0,
        headers: {},
      };

      const commitMock = jest.fn().mockResolvedValue(undefined);

      await expect(service.handleMessage(message, commitMock)).rejects.toThrow('2 out of 2 handlers failed');

      expect(mockEventHandler1.handle).toHaveBeenCalledWith(telemetryMessage);
      expect(mockEventHandler2.handle).toHaveBeenCalledWith(telemetryMessage);
      expect(commitMock).not.toHaveBeenCalled();
    });
  });

});
