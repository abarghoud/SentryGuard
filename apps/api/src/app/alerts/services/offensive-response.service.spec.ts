import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { OffensiveResponseService } from './offensive-response.service';
import { TeslaVehicleCommandService } from '../../telemetry/services/tesla-vehicle-command.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { OffensiveResponse } from '../enums/offensive-response.enum';

describe('The OffensiveResponseService class', () => {
  let service: OffensiveResponseService;

  const mockVehicleRepository = {
    findOne: jest.fn(),
  };
  let mockTeslaVehicleCommandService: MockProxy<TeslaVehicleCommandService>;

  const fakeVehicle: Vehicle = {
    id: 'vehicle-1',
    userId: 'user-1',
    vin: '5YJ3E1EA123456789',
    sentry_mode_monitoring_enabled: true,
    break_in_monitoring_enabled: false,
    offensive_response: OffensiveResponse.DISABLED,
    display_name: 'Model 3',
    created_at: new Date(),
    updated_at: new Date(),
    user: null,
  };

  beforeEach(async () => {
    mockTeslaVehicleCommandService = mock<TeslaVehicleCommandService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffensiveResponseService,
        { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepository },
        { provide: TeslaVehicleCommandService, useValue: mockTeslaVehicleCommandService },
      ],
    }).compile();

    service = module.get<OffensiveResponseService>(OffensiveResponseService);
    jest.clearAllMocks();
  });

  describe('The handleOffensiveResponse() method', () => {
    describe('When no vehicle is found for the VIN', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue(null);
      });

      it('should not trigger any command', async () => {
        await service.handleOffensiveResponse('UNKNOWN_VIN');

        expect(mockTeslaVehicleCommandService.flashLights).not.toHaveBeenCalled();
        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });
    });

    describe('When offensive response is DISABLED', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          offensive_response: OffensiveResponse.DISABLED,
        });
      });

      it('should not trigger any command', async () => {
        await service.handleOffensiveResponse('5YJ3E1EA123456789');

        expect(mockTeslaVehicleCommandService.flashLights).not.toHaveBeenCalled();
        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });
    });

    describe('When offensive response is FLASH', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          offensive_response: OffensiveResponse.FLASH,
        });
        mockTeslaVehicleCommandService.flashLights.mockResolvedValue({ success: true });
      });

      it('should trigger flash lights only', async () => {
        await service.handleOffensiveResponse('5YJ3E1EA123456789');

        expect(mockTeslaVehicleCommandService.flashLights).toHaveBeenCalledWith('5YJ3E1EA123456789', 'user-1');
        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });
    });

    describe('When offensive response is HONK', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          offensive_response: OffensiveResponse.HONK,
        });
        mockTeslaVehicleCommandService.honkHorn.mockResolvedValue({ success: true });
      });

      it('should trigger honk horn only', async () => {
        await service.handleOffensiveResponse('5YJ3E1EA123456789');

        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledWith('5YJ3E1EA123456789', 'user-1');
        expect(mockTeslaVehicleCommandService.flashLights).not.toHaveBeenCalled();
      });
    });

    describe('When offensive response is FLASH_AND_HONK', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          offensive_response: OffensiveResponse.FLASH_AND_HONK,
        });
        mockTeslaVehicleCommandService.flashLights.mockResolvedValue({ success: true });
        mockTeslaVehicleCommandService.honkHorn.mockResolvedValue({ success: true });
      });

      it('should trigger both flash lights and honk horn', async () => {
        await service.handleOffensiveResponse('5YJ3E1EA123456789');

        expect(mockTeslaVehicleCommandService.flashLights).toHaveBeenCalledWith('5YJ3E1EA123456789', 'user-1');
        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledWith('5YJ3E1EA123456789', 'user-1');
      });
    });

    describe('When monitoring is not enabled', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          sentry_mode_monitoring_enabled: false,
          break_in_monitoring_enabled: false,
          offensive_response: OffensiveResponse.FLASH,
        });
      });

      it('should not trigger any command', async () => {
        await service.handleOffensiveResponse('5YJ3E1EA123456789');

        expect(mockTeslaVehicleCommandService.flashLights).not.toHaveBeenCalled();
      });
    });

    describe('When flash lights command fails', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          offensive_response: OffensiveResponse.FLASH,
        });
        mockTeslaVehicleCommandService.flashLights.mockResolvedValue({ success: false, message: 'Token expired' });
      });

      it('should log the failure and not throw', async () => {
        await service.handleOffensiveResponse('5YJ3E1EA123456789');

        expect(mockTeslaVehicleCommandService.flashLights).toHaveBeenCalledWith('5YJ3E1EA123456789', 'user-1');
      });
    });
  });
});