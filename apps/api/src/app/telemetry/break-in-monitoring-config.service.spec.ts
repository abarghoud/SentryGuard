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
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue(null);
      });

      it('should return vehicle not found error', async () => {
        const result = await service.toggleBreakInMonitoring(vin, userId, true);
        expect(result).toEqual({ success: false, message: 'Vehicle not found' });
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

        expect(mockTelemetryConfigService.patchTelemetryConfig).toHaveBeenCalledWith(
          vin,
          userId,
          { CenterDisplay: { interval_seconds: parseInt(process.env.BREAK_IN_MONITORING_INTERVAL_SECONDS ?? String(TELEMETRY_CONFIG.DEFAULT_BREAK_IN_MONITORING_INTERVAL), 10) } },
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

      it('should patch to delete CenterDisplay', async () => {
        const result = await service.toggleBreakInMonitoring(vin, userId, false);

        expect(mockTelemetryConfigService.patchTelemetryConfig).toHaveBeenCalledWith(
          vin,
          userId,
          {},
          ['CenterDisplay']
        );
        expect(vehicle.break_in_monitoring_enabled).toBe(false);
        expect(mockVehicleRepository.save).toHaveBeenCalledWith(vehicle);
        expect(result.success).toBe(true);
      });
    });

    describe('When patch fails', () => {
      beforeEach(() => {
        const vehicle = { vin, userId, break_in_monitoring_enabled: true } as Vehicle;
        mockVehicleRepository.findOne.mockResolvedValue(vehicle);
        mockTelemetryConfigService.patchTelemetryConfig.mockResolvedValue({ success: false });
      });

      it('should return error', async () => {
        const result = await service.toggleBreakInMonitoring(vin, userId, true);

        expect(result).toEqual({ success: false, message: 'Failed to push telemetry configuration to Tesla' });
        expect(mockVehicleRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('When an exception occurs', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockRejectedValue(new Error('DB error'));
      });

      it('should handle exceptions', async () => {
        const result = await service.toggleBreakInMonitoring(vin, userId, true);
        expect(result).toEqual({ success: false, message: 'An unexpected error occurred' });
      });
    });
  });
});
