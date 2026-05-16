import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { VehicleOffensiveResponseConfigService } from './vehicle-offensive-response-config.service';
import { AlertsOffensiveResponseService } from '../offensive-response/alerts-offensive-response.service';
import { OffensiveTelegramNotificationService } from './offensive-telegram-notification.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';

describe('The VehicleOffensiveResponseConfigService class', () => {
  let service: VehicleOffensiveResponseConfigService;
  let mockOffensiveResponseService: MockProxy<AlertsOffensiveResponseService>;
  let mockNotificationService: MockProxy<OffensiveTelegramNotificationService>;
  let mockVehicleRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    mockOffensiveResponseService = mock<AlertsOffensiveResponseService>();
    mockNotificationService = mock<OffensiveTelegramNotificationService>();
    mockVehicleRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleOffensiveResponseConfigService,
        {
          provide: getRepositoryToken(Vehicle),
          useValue: mockVehicleRepository,
        },
        {
          provide: AlertsOffensiveResponseService,
          useValue: mockOffensiveResponseService,
        },
        {
          provide: OffensiveTelegramNotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<VehicleOffensiveResponseConfigService>(VehicleOffensiveResponseConfigService);
  });

  describe('The updateOffensiveResponse() method', () => {
    describe('When vehicle is found and both fields are provided', () => {
      const fakeVehicle = {
        userId: 'user-1',
        vin: 'VIN123',
        sentry_offensive_response: OffensiveResponse.DISABLED,
        break_in_offensive_response: OffensiveResponse.DISABLED,
      } as Vehicle;

      beforeEach(async () => {
        mockVehicleRepository.findOne.mockResolvedValue(fakeVehicle);
        mockVehicleRepository.save.mockImplementation(async (v) => v);
        mockNotificationService.notifyActivated.mockResolvedValue(undefined);

        await service.updateOffensiveResponse('user-1', 'VIN123', {
          sentry_offensive_response: OffensiveResponse.HONK,
          break_in_offensive_response: OffensiveResponse.HONK,
        });
      });

      it('should update both fields', () => {
        expect(fakeVehicle.sentry_offensive_response).toBe(OffensiveResponse.HONK);
        expect(fakeVehicle.break_in_offensive_response).toBe(OffensiveResponse.HONK);
      });

      it('should save the vehicle', () => {
        expect(mockVehicleRepository.save).toHaveBeenCalledWith(fakeVehicle);
      });
    });

    describe('When vehicle is found and only sentry field is provided without duration', () => {
      const fakeVehicle = {
        userId: 'user-1',
        vin: 'VIN123',
        sentry_offensive_response: OffensiveResponse.DISABLED,
        break_in_offensive_response: OffensiveResponse.DISABLED,
      } as Vehicle;

      beforeEach(async () => {
        mockVehicleRepository.findOne.mockResolvedValue(fakeVehicle);
        mockVehicleRepository.save.mockImplementation(async (v) => v);

        await service.updateOffensiveResponse('user-1', 'VIN123', {
          sentry_offensive_response: OffensiveResponse.HONK,
        });
      });

      it('should update only sentry field without until', () => {
        expect(fakeVehicle.sentry_offensive_response).toBe(OffensiveResponse.HONK);
        expect(fakeVehicle.sentry_offensive_response_until).toBeUndefined();
      });
    });

    describe('When vehicle is found and sentry is set to DISABLED', () => {
      const fakeVehicle = {
        userId: 'user-1',
        vin: 'VIN123',
        sentry_offensive_response: OffensiveResponse.HONK,
        sentry_offensive_response_until: new Date(Date.now() + 3600000),
        break_in_offensive_response: OffensiveResponse.DISABLED,
      } as Vehicle;

      beforeEach(async () => {
        mockVehicleRepository.findOne.mockResolvedValue(fakeVehicle);
        mockVehicleRepository.save.mockImplementation(async (v) => v);

        await service.updateOffensiveResponse('user-1', 'VIN123', {
          sentry_offensive_response: OffensiveResponse.DISABLED,
        });
      });

      it('should clear the until field', () => {
        expect(fakeVehicle.sentry_offensive_response).toBe(OffensiveResponse.DISABLED);
        expect(fakeVehicle.sentry_offensive_response_until).toBeNull();
      });
    });

    describe('When vehicle is not found', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue(null);
      });

      it('should return failure without saving', async () => {
        const result = await service.updateOffensiveResponse('user-1', 'VIN123', {
          sentry_offensive_response: OffensiveResponse.HONK,
        });

        expect(result).toStrictEqual({ success: false });
        expect(mockVehicleRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('The setSentryOffensiveWithDuration() method', () => {
    const fakeVehicle = {
      userId: 'user-1',
      vin: 'VIN123',
      sentry_offensive_response: OffensiveResponse.DISABLED,
      break_in_offensive_response: OffensiveResponse.DISABLED,
    } as Vehicle;

    beforeEach(() => {
      mockVehicleRepository.findOne.mockResolvedValue(fakeVehicle);
      mockVehicleRepository.save.mockImplementation(async (v) => v);
      mockNotificationService.notifyActivated.mockResolvedValue(undefined);
    });

    it('should set sentry to HONK with duration and until date', async () => {
      const result = await service.setSentryOffensiveWithDuration('user-1', 'VIN123', 60);

      expect(fakeVehicle.sentry_offensive_response).toBe(OffensiveResponse.HONK);
      expect(fakeVehicle.sentry_offensive_response_until).toBeInstanceOf(Date);
      expect(result.success).toBe(true);
    });

    it('should send activation notification', async () => {
      await service.setSentryOffensiveWithDuration('user-1', 'VIN123', 60);

      expect(mockNotificationService.notifyActivated).toHaveBeenCalledWith(fakeVehicle, 60);
    });
  });

  describe('The testSentryOffensiveResponse() method', () => {
    describe('When vehicle belongs to user', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({ userId: 'user-1', vin: 'VIN123' } as Vehicle);
        mockOffensiveResponseService.handleSentryOffensiveResponse.mockResolvedValue(undefined);
      });

      it('should delegate to handleSentryOffensiveResponse', async () => {
        await service.testSentryOffensiveResponse('user-1', 'VIN123');

        expect(mockVehicleRepository.findOne).toHaveBeenCalledWith({ where: { userId: 'user-1', vin: 'VIN123' } });
        expect(mockOffensiveResponseService.handleSentryOffensiveResponse).toHaveBeenCalledWith('VIN123', 'user-1');
      });
    });

    describe('When vehicle does not belong to user', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue(null);
      });

      it('should not trigger offensive response', async () => {
        await service.testSentryOffensiveResponse('user-1', 'VIN123');

        expect(mockOffensiveResponseService.handleSentryOffensiveResponse).not.toHaveBeenCalled();
      });
    });
  });

  describe('The testBreakInOffensiveResponse() method', () => {
    describe('When vehicle belongs to user', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({ userId: 'user-1', vin: 'VIN123' } as Vehicle);
        mockOffensiveResponseService.handleBreakInOffensiveResponse.mockResolvedValue(undefined);
      });

      it('should delegate to handleBreakInOffensiveResponse', async () => {
        await service.testBreakInOffensiveResponse('user-1', 'VIN123');

        expect(mockVehicleRepository.findOne).toHaveBeenCalledWith({ where: { userId: 'user-1', vin: 'VIN123' } });
        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).toHaveBeenCalledWith('VIN123', 'user-1');
      });
    });

    describe('When vehicle does not belong to user', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue(null);
      });

      it('should not trigger offensive response', async () => {
        await service.testBreakInOffensiveResponse('user-1', 'VIN123');

        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).not.toHaveBeenCalled();
      });
    });
  });
});