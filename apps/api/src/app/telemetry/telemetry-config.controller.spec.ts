import { BadGatewayException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryConfigController } from './telemetry-config.controller';
import { TelemetryConfigService } from './telemetry-config.service';
import { SentryModeConfigService } from './sentry-mode-config.service';
import { ConsentGuard } from '../../common/guards/consent.guard';
import { User } from '../../entities/user.entity';
import {
  TeslaVehicleWithStatus,
  ConfigureTelemetryResult,
  TelemetryConfig,
} from './telemetry-config.types';

describe('TelemetryConfigController', () => {
  let controller: TelemetryConfigController;
  let service: TelemetryConfigService;
  let sentryModeConfigService: SentryModeConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelemetryConfigController],
      providers: [
        {
          provide: TelemetryConfigService,
          useValue: {
            getVehicles: jest.fn(),
            checkTelemetryConfig: jest.fn(),
            deleteTelemetryConfig: jest.fn(),
          },
        },
        {
          provide: SentryModeConfigService,
          useValue: {
            configureTelemetry: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ConsentGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<TelemetryConfigController>(
      TelemetryConfigController
    );
    service = module.get<TelemetryConfigService>(TelemetryConfigService);
    sentryModeConfigService = module.get<SentryModeConfigService>(SentryModeConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getVehicles', () => {
    it('should return vehicles list', async () => {
      const mockVehicles: TeslaVehicleWithStatus[] = [
        { vin: 'VIN123', display_name: 'Tesla Model 3', sentry_mode_monitoring_enabled: false, key_paired: false },
        { vin: 'VIN456', display_name: 'Tesla Model Y', sentry_mode_monitoring_enabled: false, key_paired: false },
      ];

      jest.spyOn(service, 'getVehicles').mockResolvedValue(mockVehicles);

      const mockUser = { userId: 'test-user-id' } as unknown as User;

      const result = await controller.getVehicles(mockUser);

      expect(result).toEqual(mockVehicles);
      expect(service.getVehicles).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle service errors', async () => {
      jest
        .spyOn(service, 'getVehicles')
        .mockRejectedValue(new Error('Service error'));

      const mockUser = { userId: 'test-user-id' } as unknown as User;

      await expect(controller.getVehicles(mockUser)).rejects.toThrow(
        'Service error'
      );
    });
  });


  describe('configureVehicle', () => {
    it('should configure specific vehicle and return success message', async () => {
      const vin = 'TEST_VIN_123';
      const mockResult: ConfigureTelemetryResult = {
        success: true,
        skippedVehicle: null,
        response: { response: { skipped_vehicles: { missing_key: [] } } },
      };

      (sentryModeConfigService.configureTelemetry as jest.Mock).mockResolvedValue(mockResult);

      const mockUser = { userId: 'test-user-id' } as unknown as User;

      const result = await controller.configureVehicle(vin, mockUser);

      expect(result).toEqual({
        message: `Configuration started for VIN: ${vin}`,
        result: mockResult,
      });
      expect(sentryModeConfigService.configureTelemetry).toHaveBeenCalledWith(
        vin,
        'test-user-id'
      );
    });

    it('should return skipped message when VIN is rejected', async () => {
      const vin = 'TEST_VIN_123';
      const mockResult: ConfigureTelemetryResult = {
        success: false,
        skippedVehicle: { vin, reason: 'missing_key' },
        response: { response: { skipped_vehicles: { missing_key: [vin] } } },
      };

      (sentryModeConfigService.configureTelemetry as jest.Mock).mockResolvedValue(mockResult);

      const mockUser = { userId: 'test-user-id' } as unknown as User;

      const result = await controller.configureVehicle(vin, mockUser);

      expect(result).toEqual({
        message: `Configuration skipped for VIN: ${vin}`,
        result: mockResult,
      });
    });

    it('should throw a bad gateway exception when service returns null', async () => {
      const vin = 'TEST_VIN_123';

      (sentryModeConfigService.configureTelemetry as jest.Mock).mockResolvedValue(null);

      const mockUser = { userId: 'test-user-id' } as unknown as User;

      await expect(controller.configureVehicle(vin, mockUser)).rejects.toThrow(
        BadGatewayException
      );
    });

    it('should handle service errors', async () => {
      const vin = 'TEST_VIN_123';
      (sentryModeConfigService.configureTelemetry as jest.Mock).mockRejectedValue(new Error('Service error'));

      const mockUser = { userId: 'test-user-id' } as unknown as User;

      await expect(controller.configureVehicle(vin, mockUser)).rejects.toThrow(
        'Service error'
      );
    });
  });

  describe('deleteTelemetryConfig', () => {
    const vin = 'TEST_VIN_123';
    const mockUser = { userId: 'test-user-id' } as unknown as User;

    it('should return the deletion result when it succeeds', async () => {
      const expectedResult = { success: true, message: 'Configuration deleted' };
      jest
        .spyOn(service, 'deleteTelemetryConfig')
        .mockResolvedValue(expectedResult);

      const result = await controller.deleteTelemetryConfig(vin, mockUser);

      expect(result).toEqual(expectedResult);
    });

    it('should throw a bad gateway exception when the deletion fails', async () => {
      jest.spyOn(service, 'deleteTelemetryConfig').mockResolvedValue({
        success: false,
        message: 'Error deleting telemetry configuration',
      });

      await expect(
        controller.deleteTelemetryConfig(vin, mockUser)
      ).rejects.toThrow('Error deleting telemetry configuration');
    });
  });

  describe('checkConfiguration', () => {
    it('should check configuration and return result', async () => {
      const vin = 'TEST_VIN_123';
      const mockResult: TelemetryConfig = {
        config: {
          hostname: 'h',
          ca: 'c',
          fields: { SentryMode: { interval_seconds: 30 } },
        },
      };

      jest.spyOn(service, 'checkTelemetryConfig').mockResolvedValue(mockResult);

      const mockUser = { userId: 'test-user-id' } as unknown as User;

      const result = await controller.checkConfiguration(vin, mockUser);

      expect(result).toEqual({
        message: `Configuration checked for VIN: ${vin}`,
        result: mockResult,
      });
      expect(service.checkTelemetryConfig).toHaveBeenCalledWith(
        vin,
        'test-user-id'
      );
    });

    it('should handle service errors', async () => {
      const vin = 'TEST_VIN_123';
      jest
        .spyOn(service, 'checkTelemetryConfig')
        .mockRejectedValue(new Error('Service error'));

      const mockUser = { userId: 'test-user-id' } as unknown as User;

      await expect(
        controller.checkConfiguration(vin, mockUser)
      ).rejects.toThrow('Service error');
    });
  });
});
