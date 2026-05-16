import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { AlertsOffensiveResponseService } from './alerts-offensive-response.service';
import { TeslaVehicleCommandService } from '../telemetry/services/tesla-vehicle-command.service';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';

describe('The AlertsOffensiveResponseService class', () => {
  let service: AlertsOffensiveResponseService;

  const mockVehicleRepository = {
    findOne: jest.fn(),
  };
  let mockTeslaVehicleCommandService: MockProxy<TeslaVehicleCommandService>;

  const fakeVehicle: Vehicle = {
    id: 'vehicle-1',
    userId: 'user-1',
    vin: '5YJ3E1EA123456789',
    sentry_mode_monitoring_enabled: true,
    break_in_monitoring_enabled: true,
    sentry_offensive_response: OffensiveResponse.DISABLED,
    break_in_offensive_response: OffensiveResponse.DISABLED,
    display_name: 'Model 3',
    created_at: new Date(),
    updated_at: new Date(),
    user: null,
  };

  beforeEach(async () => {
    mockTeslaVehicleCommandService = mock<TeslaVehicleCommandService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsOffensiveResponseService,
        { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepository },
        { provide: TeslaVehicleCommandService, useValue: mockTeslaVehicleCommandService },
      ],
    }).compile();

    service = module.get<AlertsOffensiveResponseService>(AlertsOffensiveResponseService);
    jest.clearAllMocks();
  });

  describe('The handleSentryOffensiveResponse() method', () => {
    describe('When no vehicle is found for the VIN', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue(null);
      });

      it('should not trigger any command', async () => {
        await service.handleSentryOffensiveResponse('UNKNOWN_VIN');

        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });
    });

    describe('When sentry offensive response is DISABLED', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          sentry_offensive_response: OffensiveResponse.DISABLED,
        });
      });

      it('should not trigger any command', async () => {
        await service.handleSentryOffensiveResponse('5YJ3E1EA123456789');

        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });
    });

    describe('When sentry mode monitoring is not enabled', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          sentry_mode_monitoring_enabled: false,
          sentry_offensive_response: OffensiveResponse.HONK,
        });
      });

      it('should not trigger any command', async () => {
        await service.handleSentryOffensiveResponse('5YJ3E1EA123456789');

        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });
    });

    describe('When sentry offensive response is HONK', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          sentry_offensive_response: OffensiveResponse.HONK,
        });
        mockTeslaVehicleCommandService.honkHorn.mockResolvedValue({ success: true });
      });

      it('should trigger honk horn', async () => {
        await service.handleSentryOffensiveResponse('5YJ3E1EA123456789');

        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledWith('5YJ3E1EA123456789', 'user-1');
      });
    });
  });

  describe('The handleBreakInOffensiveResponse() method', () => {
    describe('When no vehicle is found for the VIN', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue(null);
      });

      it('should not trigger any command', async () => {
        await service.handleBreakInOffensiveResponse('UNKNOWN_VIN');

        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });
    });

    describe('When break-in offensive response is DISABLED', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          break_in_offensive_response: OffensiveResponse.DISABLED,
        });
      });

      it('should not trigger any command', async () => {
        await service.handleBreakInOffensiveResponse('5YJ3E1EA123456789');

        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });
    });

    describe('When break-in monitoring is not enabled', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          break_in_monitoring_enabled: false,
          break_in_offensive_response: OffensiveResponse.HONK,
        });
      });

      it('should not trigger any command', async () => {
        await service.handleBreakInOffensiveResponse('5YJ3E1EA123456789');

        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });
    });

    describe('When break-in offensive response is HONK', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          break_in_offensive_response: OffensiveResponse.HONK,
        });
        mockTeslaVehicleCommandService.honkHorn.mockResolvedValue({ success: true });
      });

      it('should trigger honk horn only', async () => {
        await service.handleBreakInOffensiveResponse('5YJ3E1EA123456789');

        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledWith('5YJ3E1EA123456789', 'user-1');
      });
    });
  });
});