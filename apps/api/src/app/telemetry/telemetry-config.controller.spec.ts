import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryConfigController } from './telemetry-config.controller';
import { TelemetryConfigService } from './telemetry-config.service';

describe('TelemetryConfigController', () => {
  let controller: TelemetryConfigController;
  let service: TelemetryConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelemetryConfigController],
      providers: [
        {
          provide: TelemetryConfigService,
          useValue: {
            getVehicles: jest.fn(),
            configureAllVehicles: jest.fn(),
            configureTelemetry: jest.fn(),
            checkTelemetryConfig: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TelemetryConfigController>(
      TelemetryConfigController
    );
    service = module.get<TelemetryConfigService>(TelemetryConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getVehicles', () => {
    it('should return vehicles list', async () => {
      const mockVehicles = [
        { vin: 'VIN123', display_name: 'Tesla Model 3' },
        { vin: 'VIN456', display_name: 'Tesla Model Y' },
      ];

      jest.spyOn(service, 'getVehicles').mockResolvedValue(mockVehicles);

      const mockUser = { userId: 'test-user-id' };

      const result = await controller.getVehicles(mockUser);

      expect(result).toEqual(mockVehicles);
      expect(service.getVehicles).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle service errors', async () => {
      jest
        .spyOn(service, 'getVehicles')
        .mockRejectedValue(new Error('Service error'));

      const mockUser = { userId: 'test-user-id' };

      await expect(controller.getVehicles(mockUser)).rejects.toThrow(
        'Service error'
      );
    });
  });

  describe('configureAllVehicles', () => {
    it('should configure all vehicles and return success message', async () => {
      jest.spyOn(service, 'configureAllVehicles').mockResolvedValue();

      const mockUser = { userId: 'test-user-id' };

      const result = await controller.configureAllVehicles(mockUser);

      expect(result).toEqual({
        message: 'Telemetry configuration started for all vehicles',
      });
      expect(service.configureAllVehicles).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle service errors', async () => {
      jest
        .spyOn(service, 'configureAllVehicles')
        .mockRejectedValue(new Error('Service error'));

      const mockUser = { userId: 'test-user-id' };

      await expect(controller.configureAllVehicles(mockUser)).rejects.toThrow(
        'Service error'
      );
    });
  });

  describe('configureVehicle', () => {
    it('should configure specific vehicle and return success message', async () => {
      const vin = 'TEST_VIN_123';
      const mockResult = { success: true };

      jest.spyOn(service, 'configureTelemetry').mockResolvedValue(mockResult);

      const mockUser = { userId: 'test-user-id' };

      const result = await controller.configureVehicle(vin, mockUser);

      expect(result).toEqual({
        message: `Configuration started for VIN: ${vin}`,
        result: mockResult,
      });
      expect(service.configureTelemetry).toHaveBeenCalledWith(
        vin,
        'test-user-id'
      );
    });

    it('should handle service errors', async () => {
      const vin = 'TEST_VIN_123';
      jest
        .spyOn(service, 'configureTelemetry')
        .mockRejectedValue(new Error('Service error'));

      const mockUser = { userId: 'test-user-id' };

      await expect(controller.configureVehicle(vin, mockUser)).rejects.toThrow(
        'Service error'
      );
    });
  });

  describe('checkConfiguration', () => {
    it('should check configuration and return result', async () => {
      const vin = 'TEST_VIN_123';
      const mockResult = { fields: { SentryMode: { interval_seconds: 30 } } };

      jest.spyOn(service, 'checkTelemetryConfig').mockResolvedValue(mockResult);

      const mockUser = { userId: 'test-user-id' };

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

      const mockUser = { userId: 'test-user-id' };

      await expect(
        controller.checkConfiguration(vin, mockUser)
      ).rejects.toThrow('Service error');
    });
  });
});
