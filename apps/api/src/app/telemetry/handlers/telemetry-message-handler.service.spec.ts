import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TelemetryMessageHandlerService } from './telemetry-message-handler.service';
import { TelegramService } from '../../telegram/telegram.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { User } from '../../../entities/user.entity';
import { TelemetryEventHandler, TelemetryEventHandlerSymbol } from '../interfaces/telemetry-event-handler.interface';
import { mock } from 'jest-mock-extended';
import { Repository } from 'typeorm';
import { TelemetryValidationService } from '../services/telemetry-validation.service';
import { TelemetryMessage } from '../models/telemetry-message.model';
import { KafkaLogContextService } from '../../../common/services/kafka-log-context.service';
import { plainToInstance } from 'class-transformer';
import { randomBytes } from 'crypto';

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
}));

const mockDateNow = jest.spyOn(Date, 'now');

const mockTelegramService = mock<TelegramService>();
const mockVehicleRepository = mock<Repository<Vehicle>>();
const mockUserRepository = mock<Repository<User>>();
const mockEventHandler1 = mock<TelemetryEventHandler>();
const mockEventHandler2 = mock<TelemetryEventHandler>();
const mockValidationService = mock<TelemetryValidationService>();
const mockKafkaLogContextService = mock<KafkaLogContextService>();
mockKafkaLogContextService.runWithContext.mockImplementation(
  (_context, callback) => callback()
);

describe('The TelemetryMessageHandlerService class', () => {
  let service: TelemetryMessageHandlerService;

  beforeEach(async () => {
    mockDateNow.mockReturnValue(1234567890000);
    (randomBytes as jest.Mock).mockReturnValue(Buffer.from('abcd', 'hex'));
    mockEventHandler1.handle.mockResolvedValue(undefined);
    mockEventHandler2.handle.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryMessageHandlerService,
        {
          provide: TelemetryValidationService,
          useValue: mockValidationService,
        },
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
        {
          provide: KafkaLogContextService,
          useValue: mockKafkaLogContextService,
        },
      ],
    }).compile();

    service = module.get<TelemetryMessageHandlerService>(TelemetryMessageHandlerService);

    jest.clearAllMocks();
    mockKafkaLogContextService.runWithContext.mockImplementation(
      (_context, callback) => callback()
    );
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

      mockValidationService.validateMessage.mockResolvedValueOnce({
        isValidMessage: true,
        errors: [],
        telemetryMessage: plainToInstance(TelemetryMessage, {
          ...telemetryMessage,
          correlationId: 'offset-0-TEST_VIN-fr5hugk0-abcd',
        }),
      });

      const commitMock = jest.fn().mockResolvedValue(undefined);

      await service.handleMessage(message, commitMock);

      expect(mockEventHandler1.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          ...telemetryMessage,
          correlationId: 'offset-0-TEST_VIN-fr5hugk0-abcd',
        })
      );
      expect(mockEventHandler2.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          ...telemetryMessage,
          correlationId: 'offset-0-TEST_VIN-fr5hugk0-abcd',
        })
      );
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

      mockValidationService.validateMessage.mockResolvedValueOnce({
        isValidMessage: true,
        errors: [],
        telemetryMessage: plainToInstance(TelemetryMessage, {
          ...telemetryMessage,
          correlationId: 'offset-0-TEST_VIN-fr5hugk0-abcd',
        }),
      });

      mockEventHandler1.handle.mockRejectedValue(new Error('Handler error'));

      const commitMock = jest.fn().mockResolvedValue(undefined);

      await expect(service.handleMessage(message, commitMock)).rejects.toThrow('1 out of 2 handlers failed');

      expect(mockEventHandler1.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          ...telemetryMessage,
          correlationId: 'offset-0-TEST_VIN-fr5hugk0-abcd',
        })
      );
      expect(mockEventHandler2.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          ...telemetryMessage,
          correlationId: 'offset-0-TEST_VIN-fr5hugk0-abcd',
        })
      );
      expect(commitMock).not.toHaveBeenCalled();
    });

    it('should execute all handlers even when some fail with Promise.allSettled', async () => {
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

      mockValidationService.validateMessage.mockResolvedValueOnce({
        isValidMessage: true,
        errors: [],
        telemetryMessage: plainToInstance(TelemetryMessage, {
          ...telemetryMessage,
          correlationId: 'offset-0-TEST_VIN-fr5hugk0-abcd',
        }),
      });
      mockEventHandler1.handle.mockRejectedValue(new Error('Handler 1 failed'));
      mockEventHandler2.handle.mockResolvedValue(undefined);

      const commitMock = jest.fn().mockResolvedValue(undefined);

      await expect(service.handleMessage(message, commitMock)).rejects.toThrow('1 out of 2 handlers failed');

      expect(mockEventHandler1.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          ...telemetryMessage,
          correlationId: 'offset-0-TEST_VIN-fr5hugk0-abcd',
        })
      );
      expect(mockEventHandler2.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          ...telemetryMessage,
          correlationId: 'offset-0-TEST_VIN-fr5hugk0-abcd',
        })
      );
      expect(commitMock).not.toHaveBeenCalled();
    });

    it('should handle multiple handler failures', async () => {
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

      mockValidationService.validateMessage.mockResolvedValueOnce({
        isValidMessage: true,
        errors: [],
        telemetryMessage: plainToInstance(TelemetryMessage, {
          ...telemetryMessage,
          correlationId: 'offset-0-TEST_VIN-fr5hugk0-abcd',
        }),
      });
      const error1 = new Error('Handler 1 failed');
      const error2 = new Error('Handler 2 failed');
      mockEventHandler1.handle.mockRejectedValue(error1);
      mockEventHandler2.handle.mockRejectedValue(error2);

      const commitMock = jest.fn().mockResolvedValue(undefined);

      await expect(service.handleMessage(message, commitMock)).rejects.toThrow('2 out of 2 handlers failed');

      expect(mockEventHandler1.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          ...telemetryMessage,
          correlationId: 'offset-0-TEST_VIN-fr5hugk0-abcd',
        })
      );
      expect(mockEventHandler2.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          ...telemetryMessage,
          correlationId: 'offset-0-TEST_VIN-fr5hugk0-abcd',
        })
      );
      expect(commitMock).not.toHaveBeenCalled();
    });
  });
 });
