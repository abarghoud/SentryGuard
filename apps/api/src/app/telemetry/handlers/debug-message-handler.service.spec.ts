import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DebugMessageHandlerService } from './debug-message-handler.service';
import { TelegramService } from '../../telegram/telegram.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { User } from '../../../entities/user.entity';
import { TelemetryMessage } from './interfaces/telemetry-event-handler.interface';
import { mock } from 'jest-mock-extended';
import { Repository } from 'typeorm';

const mockTelegramService = mock<TelegramService>();
const mockVehicleRepository = mock<Repository<Vehicle>>();
const mockUserRepository = mock<Repository<User>>();

describe('The DebugMessageHandlerService class', () => {
  let service: DebugMessageHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DebugMessageHandlerService,
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
      ],
    }).compile();

    service = module.get<DebugMessageHandlerService>(DebugMessageHandlerService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('The handle method', () => {
    const mockTelemetryMessage: TelemetryMessage = {
      data: [
        {
          key: 'test_key',
          value: {
            stringValue: 'test_value',
          },
        },
      ],
      createdAt: '2024-01-01T00:00:00Z',
      vin: 'TESTVIN123',
      isResend: false,
    };

    let handlePromise: Promise<void>;

    describe('when user has debug_messages enabled', () => {
      beforeEach(async () => {
        const mockVehicle = { userId: 'user123' };
        const mockUser = { debug_messages: true };

        mockVehicleRepository.findOne.mockResolvedValue(mockVehicle as Vehicle);
        mockUserRepository.findOne.mockResolvedValue(mockUser as User);
        mockTelegramService.sendTelegramMessage.mockResolvedValue(true);

        handlePromise = service.handle(mockTelemetryMessage);
      });

      it('should send debug message', async () => {
        await handlePromise;

        expect(mockVehicleRepository.findOne).toHaveBeenCalledWith({
          where: { vin: mockTelemetryMessage.vin },
          select: ['userId'],
        });
        expect(mockUserRepository.findOne).toHaveBeenCalledWith({
          where: { userId: 'user123' },
          select: ['debug_messages'],
        });
        expect(mockTelegramService.sendTelegramMessage).toHaveBeenCalledWith(
          'user123',
          JSON.stringify(mockTelemetryMessage)
        );
      });
    });

    describe('when vehicle is not found', () => {
      beforeEach(async () => {
        mockVehicleRepository.findOne.mockResolvedValue(null);

        handlePromise = service.handle(mockTelemetryMessage);
      });

      it('should not send message', async () => {
        await handlePromise;

        expect(mockVehicleRepository.findOne).toHaveBeenCalledWith({
          where: { vin: mockTelemetryMessage.vin },
          select: ['userId'],
        });
        expect(mockUserRepository.findOne).not.toHaveBeenCalled();
        expect(mockTelegramService.sendTelegramMessage).not.toHaveBeenCalled();
      });
    });

    describe('when user has debug_messages disabled', () => {
      beforeEach(async () => {
        const mockVehicle = { userId: 'user123' };
        const mockUser = { debug_messages: false };

        mockVehicleRepository.findOne.mockResolvedValue(mockVehicle as Vehicle);
        mockUserRepository.findOne.mockResolvedValue(mockUser as User);

        handlePromise = service.handle(mockTelemetryMessage);
      });

      it('should not send message', async () => {
        await handlePromise;

        expect(mockVehicleRepository.findOne).toHaveBeenCalledWith({
          where: { vin: mockTelemetryMessage.vin },
          select: ['userId'],
        });
        expect(mockUserRepository.findOne).toHaveBeenCalledWith({
          where: { userId: 'user123' },
          select: ['debug_messages'],
        });
        expect(mockTelegramService.sendTelegramMessage).not.toHaveBeenCalled();
      });
    });

    describe('when user is not found', () => {
      beforeEach(async () => {
        const mockVehicle = { userId: 'user123' };

        mockVehicleRepository.findOne.mockResolvedValue(mockVehicle as Vehicle);
        mockUserRepository.findOne.mockResolvedValue(null);

        handlePromise = service.handle(mockTelemetryMessage);
      });

      it('should not send message', async () => {
        await handlePromise;

        expect(mockVehicleRepository.findOne).toHaveBeenCalledWith({
          where: { vin: mockTelemetryMessage.vin },
          select: ['userId'],
        });
        expect(mockUserRepository.findOne).toHaveBeenCalledWith({
          where: { userId: 'user123' },
          select: ['debug_messages'],
        });
        expect(mockTelegramService.sendTelegramMessage).not.toHaveBeenCalled();
      });
    });

    describe('when repository query fails', () => {
      beforeEach(async () => {
        const error = new Error('Database error');
        mockVehicleRepository.findOne.mockRejectedValue(error);

        handlePromise = service.handle(mockTelemetryMessage);
      });

      it('should throw error', async () => {
        await expect(handlePromise).rejects.toThrow('Database error');
      });
    });
  });
});
