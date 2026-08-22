import {
  BadGatewayException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';
import { BreakInMonitoringConfigService } from './break-in-monitoring-config.service';
import { TelemetryConfigService } from './telemetry-config.service';
import { Vehicle } from '../../entities/vehicle.entity';
import { TELEMETRY_CONFIG } from './telemetry-config.constants';

describe('The BreakInMonitoringConfigService class', () => {
  let service: BreakInMonitoringConfigService;

  let mockTelemetryConfigService: MockProxy<TelemetryConfigService>;
  let mockVehicleRepository: MockProxy<Repository<Vehicle>>;

  beforeEach(async () => {
    mockTelemetryConfigService = mock<TelemetryConfigService>();
    mockVehicleRepository = mock<Repository<Vehicle>>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BreakInMonitoringConfigService,
        { provide: TelemetryConfigService, useValue: mockTelemetryConfigService },
        { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepository },
      ],
    }).compile();

    service = module.get<BreakInMonitoringConfigService>(BreakInMonitoringConfigService);
  });

  describe('The toggleBreakInMonitoring() method', () => {
    const vin = 'VIN123';
    const userId = 'user1';

    describe('When vehicle is missing', () => {
      let act: () => Promise<unknown>;

      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue(null);
        act = async () => await service.toggleBreakInMonitoring(vin, userId, true);
      });

      it('should throw a not found exception', async () => {
        await expect(act()).rejects.toThrow(NotFoundException);
      });

      it('should not push any telemetry configuration', async () => {
        await expect(act()).rejects.toThrow();
        expect(mockTelemetryConfigService.patchTelemetryConfig).not.toHaveBeenCalled();
      });
    });

    describe('When enabling monitoring', () => {
      let vehicle: Vehicle;

      beforeEach(() => {
        vehicle = { vin, userId, break_in_monitoring_enabled: false } as Vehicle;
        mockVehicleRepository.findOne.mockResolvedValue(vehicle);
        mockTelemetryConfigService.patchTelemetryConfig.mockResolvedValue({ success: true });
      });

      it('should patch to add CenterDisplay with interval', async () => {
        const result = await service.toggleBreakInMonitoring(vin, userId, true);

        const expectedInterval = parseInt(process.env.BREAK_IN_MONITORING_INTERVAL_SECONDS ?? String(TELEMETRY_CONFIG.DEFAULT_BREAK_IN_MONITORING_INTERVAL), 10);
        expect(mockTelemetryConfigService.patchTelemetryConfig).toHaveBeenCalledWith(
          vin,
          userId,
          {
            CenterDisplay: { interval_seconds: expectedInterval },
            ChargePortLatch: { interval_seconds: expectedInterval },
          },
          []
        );
        expect(vehicle.break_in_monitoring_enabled).toBe(true);
        expect(mockVehicleRepository.save).toHaveBeenCalledWith(vehicle);
        expect(result.success).toBe(true);
      });
    });

    describe('When disabling monitoring', () => {
      let vehicle: Vehicle;

      beforeEach(() => {
        vehicle = { vin, userId, break_in_monitoring_enabled: true } as Vehicle;
        mockVehicleRepository.findOne.mockResolvedValue(vehicle);
        mockTelemetryConfigService.patchTelemetryConfig.mockResolvedValue({ success: true });
      });

      it('should patch to delete CenterDisplay and ChargePortLatch', async () => {
        const result = await service.toggleBreakInMonitoring(vin, userId, false);

        expect(mockTelemetryConfigService.patchTelemetryConfig).toHaveBeenCalledWith(
          vin,
          userId,
          {},
          ['CenterDisplay', 'ChargePortLatch']
        );
        expect(vehicle.break_in_monitoring_enabled).toBe(false);
        expect(mockVehicleRepository.save).toHaveBeenCalledWith(vehicle);
        expect(result.success).toBe(true);
      });
    });

    describe('When patch fails', () => {
      let act: () => Promise<unknown>;

      beforeEach(() => {
        const vehicle = { vin, userId, break_in_monitoring_enabled: true } as Vehicle;
        mockVehicleRepository.findOne.mockResolvedValue(vehicle);
        mockTelemetryConfigService.patchTelemetryConfig.mockResolvedValue({ success: false });
        act = async () => await service.toggleBreakInMonitoring(vin, userId, true);
      });

      it('should throw a bad gateway exception', async () => {
        await expect(act()).rejects.toThrow(BadGatewayException);
      });

      it('should expose the Tesla push failure message', async () => {
        await expect(act()).rejects.toThrow('Failed to push telemetry configuration to Tesla');
      });

      it('should not persist the vehicle', async () => {
        await expect(act()).rejects.toThrow();
        expect(mockVehicleRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('When an unexpected exception occurs', () => {
      let act: () => Promise<unknown>;

      beforeEach(() => {
        mockVehicleRepository.findOne.mockRejectedValue(new Error('DB error'));
        act = async () => await service.toggleBreakInMonitoring(vin, userId, true);
      });

      it('should throw an internal server error exception', async () => {
        await expect(act()).rejects.toThrow(InternalServerErrorException);
      });

      it('should not leak the underlying error message', async () => {
        await expect(act()).rejects.toThrow('An unexpected error occurred');
      });
    });
  });
});
