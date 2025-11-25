import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SentryAlertHandlerService } from './sentry-alert-handler.service';
import { TelegramService } from '../../telegram/telegram.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { User } from '../../../entities/user.entity';
import { TelemetryMessage } from './interfaces/telemetry-event-handler.interface';
import { mock } from 'jest-mock-extended';
import { Repository } from 'typeorm';

const mockTelegramService = mock<TelegramService>();
const mockVehicleRepository = mock<Repository<Vehicle>>();
const mockUserRepository = mock<Repository<User>>();

describe('The SentryAlertHandlerService class', () => {
  let service: SentryAlertHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentryAlertHandlerService,
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

    service = module.get<SentryAlertHandlerService>(SentryAlertHandlerService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('The handle method', () => {
    const baseTelemetryMessage: TelemetryMessage = {
      data: [
        {
          key: 'SentryMode',
          value: { stringValue: 'Aware' },
        },
      ],
      createdAt: '2025-01-21T10:00:00.000Z',
      vin: 'TEST_VIN_123',
      isResend: false,
    };

    let handlePromise: Promise<void>;

    describe('when SentryMode is Aware and vehicle exists', () => {
      beforeEach(async () => {
        mockVehicleRepository.findOne.mockResolvedValue({
          userId: 'test-user',
          display_name: 'Test Vehicle'
        } as Vehicle);
        mockTelegramService.sendSentryAlert.mockResolvedValue(true);

        handlePromise = service.handle(baseTelemetryMessage);
      });

      it('should send Sentry alert', async () => {
        await handlePromise;

        expect(mockVehicleRepository.findOne).toHaveBeenCalledWith({
          where: { vin: 'TEST_VIN_123' },
          select: ['userId', 'display_name'],
        });

        expect(mockTelegramService.sendSentryAlert).toHaveBeenCalledWith('test-user', {
          vin: 'TEST_VIN_123',
          display_name: 'Test Vehicle',
        });
      });
    });

    describe('when SentryMode is not Aware', () => {
      beforeEach(async () => {
        const telemetryMessage = {
          ...baseTelemetryMessage,
          data: [
            {
              key: 'SentryMode',
              value: { stringValue: 'Off' },
            },
          ],
        };

        handlePromise = service.handle(telemetryMessage);
      });

      it('should not send alert', async () => {
        await handlePromise;

        expect(mockVehicleRepository.findOne).not.toHaveBeenCalled();
        expect(mockTelegramService.sendSentryAlert).not.toHaveBeenCalled();
      });
    });

    describe('when SentryMode data is missing', () => {
      beforeEach(async () => {
        const telemetryMessage = {
          ...baseTelemetryMessage,
          data: [
            {
              key: 'OtherData',
              value: { stringValue: 'SomeValue' },
            },
          ],
        };

        handlePromise = service.handle(telemetryMessage);
      });

      it('should not send alert', async () => {
        await handlePromise;

        expect(mockVehicleRepository.findOne).not.toHaveBeenCalled();
        expect(mockTelegramService.sendSentryAlert).not.toHaveBeenCalled();
      });
    });

    describe('when vehicle is not found', () => {
      beforeEach(async () => {
        mockVehicleRepository.findOne.mockResolvedValue(null);

        handlePromise = service.handle(baseTelemetryMessage);
      });

      it('should not send alert', async () => {
        await handlePromise;

        expect(mockTelegramService.sendSentryAlert).not.toHaveBeenCalled();
      });
    });

    describe('when repository query fails', () => {
      beforeEach(async () => {
        mockVehicleRepository.findOne.mockRejectedValue(new Error('Database error'));

        handlePromise = service.handle(baseTelemetryMessage);
      });

      it('should throw error', async () => {
        await expect(handlePromise).rejects.toThrow('Database error');

        expect(mockTelegramService.sendSentryAlert).not.toHaveBeenCalled();
      });
    });

    describe('when Telegram service fails', () => {
      beforeEach(async () => {
        mockVehicleRepository.findOne.mockResolvedValue({
          userId: 'test-user',
          display_name: 'Test Vehicle'
        } as Vehicle);
        mockTelegramService.sendSentryAlert.mockRejectedValue(new Error('Telegram error'));

        handlePromise = service.handle(baseTelemetryMessage);
      });

      it('should throw error', async () => {
        await expect(handlePromise).rejects.toThrow('Telegram error');
      });
    });
  });
});
