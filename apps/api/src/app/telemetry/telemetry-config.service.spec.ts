import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TelemetryConfigService } from './telemetry-config.service';
import { AuthService } from '../auth/auth.service';
import { Vehicle } from '../../entities/vehicle.entity';
import { TeslaVehicleWithStatus } from './telemetry-config.types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const createMockVehicle = (
  overrides: Partial<TeslaVehicleWithStatus>
): TeslaVehicleWithStatus => ({
  vin: 'VIN123',
  display_name: 'Tesla Model 3',
  telemetry_enabled: false,
  key_paired: false,
  ...overrides,
});

const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
};

mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

const mockAuthService = {
  getAccessTokenForUserId: jest.fn(),
  getAccessToken: jest.fn(), // For backward compatibility
};

const mockVehicleRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

describe('TelemetryConfigService', () => {
  let service: TelemetryConfigService;

  beforeEach(async () => {
    process.env.ACCESS_TOKEN = 'test_access_token';
    process.env.LETS_ENCRYPT_CERTIFICATE =
      Buffer.from('test_certificate').toString('base64');
    process.env.TESLA_FLEET_TELEMETRY_SERVER_HOSTNAME = 'test-hostname';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryConfigService,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: getRepositoryToken(Vehicle),
          useValue: mockVehicleRepository,
        },
      ],
    }).compile();

    service = module.get<TelemetryConfigService>(TelemetryConfigService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.ACCESS_TOKEN;
    delete process.env.LETS_ENCRYPT_CERTIFICATE;
    delete process.env.TESLA_FLEET_TELEMETRY_SERVER_HOSTNAME;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getVehicles', () => {
    it('should return empty array and log error when token is invalid', async () => {
      const userId = 'test-user-id';
      mockAuthService.getAccessTokenForUserId.mockResolvedValue(null);
      const loggerSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      const result = await service.getVehicles(userId);

      expect(result).toEqual([]);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Error fetching vehicles:',
        'Invalid or expired token for this user'
      );
      loggerSpy.mockRestore();
    });
    it('should return vehicles with telemetry data when userId is provided', async () => {
      const userId = 'test-user-id';
      const userToken = 'user-access-token';
      const mockVehicles = [
        { vin: 'VIN123', display_name: 'Tesla Model 3' },
        { vin: 'VIN456', display_name: 'Tesla Model Y' },
      ];

      mockAuthService.getAccessTokenForUserId.mockResolvedValue(userToken);
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { response: mockVehicles },
      });

      const mockDbVehicles = [
        { vin: 'VIN123', telemetry_enabled: true },
        { vin: 'VIN456', telemetry_enabled: false },
      ];

      const telemetryConfigsMap = new Map();
      telemetryConfigsMap.set('VIN123', { key_paired: true, config: {} });
      telemetryConfigsMap.set('VIN456', { key_paired: true, config: {} });

      jest
        .spyOn(service as any, 'syncVehiclesToDatabase')
        .mockResolvedValue(telemetryConfigsMap);
      jest
        .spyOn(service as any, 'getUserVehiclesFromDB')
        .mockResolvedValue(mockDbVehicles);

      const result = await service.getVehicles(userId);

      expect(result).toEqual([
        { ...mockVehicles[0], telemetry_enabled: true, key_paired: true },
        { ...mockVehicles[1], telemetry_enabled: false, key_paired: true },
      ]);
    });

    it('should return empty array on error', async () => {
      mockAuthService.getAccessTokenForUserId.mockResolvedValue('test-token');
      const loggerSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.getVehicles('test-user-id');

      expect(result).toEqual([]);
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });

    it('should create new vehicle in database when it does not exist', async () => {
      const userId = 'test-user-id';
      const mockVehicles = [
        {
          vin: 'VIN123',
          display_name: 'Tesla Model 3',
          vehicle_state: { car_type: 'model3' },
        },
      ];

      mockAuthService.getAccessTokenForUserId.mockResolvedValue('user-token');
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { response: mockVehicles },
        })
        .mockResolvedValueOnce({
          data: { response: { config: null } },
        });

      mockVehicleRepository.findOne.mockResolvedValue(null);
      mockVehicleRepository.create.mockReturnValue({
        vin: 'VIN123',
        telemetry_enabled: false,
      } as Vehicle);
      mockVehicleRepository.save.mockResolvedValue({
        vin: 'VIN123',
        telemetry_enabled: false,
      } as Vehicle);
      mockVehicleRepository.find.mockResolvedValue([
        { vin: 'VIN123', telemetry_enabled: false },
      ]);

      await service.getVehicles(userId);

      expect(mockVehicleRepository.create).toHaveBeenCalledWith({
        userId,
        vin: 'VIN123',
        display_name: 'Tesla Model 3',
        model: 'model3',
        telemetry_enabled: false,
      });
      expect(mockVehicleRepository.save).toHaveBeenCalled();
    });

    it('should update vehicle display_name when it changes', async () => {
      const userId = 'test-user-id';
      const mockVehicles = [{ vin: 'VIN123', display_name: 'Updated Name' }];

      const existingVehicle = {
        vin: 'VIN123',
        display_name: 'Old Name',
        telemetry_enabled: false,
      };

      mockAuthService.getAccessTokenForUserId.mockResolvedValue('user-token');
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { response: mockVehicles },
        })
        .mockResolvedValueOnce({
          data: { response: { config: null } },
        });

      mockVehicleRepository.findOne.mockResolvedValue(existingVehicle);
      mockVehicleRepository.save.mockResolvedValue(existingVehicle);
      mockVehicleRepository.find.mockResolvedValue([existingVehicle]);

      await service.getVehicles(userId);

      expect(existingVehicle.display_name).toBe('Updated Name');
      expect(mockVehicleRepository.save).toHaveBeenCalledWith(existingVehicle);
    });

    it('should set telemetry_enabled to true when config is not null', async () => {
      const userId = 'test-user-id';
      const mockVehicles = [{ vin: 'VIN123', display_name: 'Tesla Model 3' }];

      mockAuthService.getAccessTokenForUserId.mockResolvedValue('user-token');
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { response: mockVehicles },
        })
        .mockResolvedValueOnce({
          data: { response: { config: { hostname: 'test.com' } } },
        });

      const existingVehicle = {
        vin: 'VIN123',
        display_name: 'Tesla Model 3',
        telemetry_enabled: false,
      };

      mockVehicleRepository.findOne.mockResolvedValue(existingVehicle);
      mockVehicleRepository.save.mockResolvedValue(existingVehicle);
      mockVehicleRepository.find.mockResolvedValue([
        { ...existingVehicle, telemetry_enabled: true },
      ]);

      await service.getVehicles(userId);

      expect(existingVehicle.telemetry_enabled).toBe(true);
    });
  });

  describe('getUserVehiclesFromDB', () => {
    it('should return vehicles ordered by created_at', async () => {
      const userId = 'test-user-id';
      const mockVehicles = [{ vin: 'VIN123' }, { vin: 'VIN456' }];

      mockVehicleRepository.find.mockResolvedValue(mockVehicles);

      const result = await service.getUserVehiclesFromDB(userId);

      expect(result).toEqual(mockVehicles);
      expect(mockVehicleRepository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { created_at: 'ASC' },
      });
    });
  });

  describe('configureTelemetry', () => {
    it('should configure telemetry successfully', async () => {
      const vin = 'VIN123';
      const userId = 'test-user-id';
      const userToken = 'user-access-token';

      mockAuthService.getAccessTokenForUserId.mockResolvedValue(userToken);
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { success: true },
      });

      const result = await service.configureTelemetry(vin, userId);

      expect(result).toEqual({ success: true });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/1/vehicles/fleet_telemetry_config',
        {
          config: {
            ca: 'test_certificate',
            hostname: 'test-hostname',
            port: 12345,
            fields: {
              SentryMode: { interval_seconds: 30 },
            },
          },
          vins: [vin],
        },
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should return null when LETS_ENCRYPT_CERTIFICATE is not set', async () => {
      delete process.env.LETS_ENCRYPT_CERTIFICATE;

      const result = await service.configureTelemetry('VIN123', 'test-user-id');

      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      const loggerSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.configureTelemetry('VIN123', 'test-user-id');

      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });

    it('should update vehicle telemetry status when userId provided', async () => {
      const vin = 'VIN123';
      const userId = 'test-user-id';

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { success: true },
      });

      const updateSpy = jest
        .spyOn(service, 'updateVehicleTelemetryStatus')
        .mockResolvedValue(undefined);

      await service.configureTelemetry(vin, userId);

      expect(updateSpy).toHaveBeenCalledWith(userId, vin, true);
    });
  });

  describe('updateVehicleTelemetryStatus', () => {
    it('should update telemetry status to enabled', async () => {
      const userId = 'test-user-id';
      const vin = 'VIN123';
      const vehicle = { telemetry_enabled: false };

      mockVehicleRepository.findOne.mockResolvedValue(vehicle);
      mockVehicleRepository.save.mockResolvedValue(vehicle);

      await service.updateVehicleTelemetryStatus(userId, vin, true);

      expect(vehicle.telemetry_enabled).toBe(true);
      expect(mockVehicleRepository.save).toHaveBeenCalledWith(vehicle);
      expect(mockVehicleRepository.findOne).toHaveBeenCalledWith({
        where: { userId, vin },
      });
    });

    it('should not update if vehicle not found', async () => {
      const userId = 'test-user-id';
      const vin = 'VIN123';

      mockVehicleRepository.findOne.mockResolvedValue(null);

      await service.updateVehicleTelemetryStatus(userId, vin, true);

      expect(mockVehicleRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('checkTelemetryConfig', () => {
    it('should return telemetry config successfully', async () => {
      const vin = 'VIN123';
      const mockConfig = { fields: { SentryMode: { interval_seconds: 30 } } };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { response: mockConfig },
      });

      const result = await service.checkTelemetryConfig(vin, 'test-user-id');

      expect(result).toEqual(mockConfig);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/api/1/vehicles/${vin}/fleet_telemetry_config`,
        expect.objectContaining({
          headers: { Authorization: 'Bearer user-access-token' },
        })
      );
    });

    it('should return null on error', async () => {
      const loggerSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.checkTelemetryConfig(
        'VIN123',
        'test-user-id'
      );

      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });

  describe('configureAllVehicles', () => {
    it('should configure telemetry for all vehicles', async () => {
      const userId = 'test-user-id';
      const mockVehicles = [
        createMockVehicle({ vin: 'VIN123', display_name: 'Tesla Model 3' }),
        createMockVehicle({ vin: 'VIN456', display_name: 'Tesla Model Y' }),
      ];

      jest.spyOn(service, 'getVehicles').mockResolvedValue(mockVehicles);

      jest
        .spyOn(service, 'configureTelemetry')
        .mockResolvedValueOnce({ response: { success: true } })
        .mockResolvedValueOnce({ response: { success: true } });

      jest
        .spyOn(service, 'checkTelemetryConfig')
        .mockResolvedValueOnce({ config: null, fields: {} })
        .mockResolvedValueOnce({ config: null, fields: {} });

      await service.configureAllVehicles(userId);

      expect(service.configureTelemetry).toHaveBeenCalledTimes(2);
      expect(service.checkTelemetryConfig).toHaveBeenCalledTimes(2);
    });

    it('should handle empty vehicles list', async () => {
      const userId = 'test-user-id';

      jest.spyOn(service, 'getVehicles').mockResolvedValue([]);

      const loggerSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();

      await service.configureAllVehicles(userId);

      expect(loggerSpy).toHaveBeenCalledWith('⚠️ No vehicles found.');
      loggerSpy.mockRestore();
    });

    it('should handle getVehicles error', async () => {
      const userId = 'test-user-id';

      jest.spyOn(service, 'getVehicles').mockResolvedValue([]);

      const loggerSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();

      await service.configureAllVehicles(userId);

      expect(loggerSpy).toHaveBeenCalledWith('⚠️ No vehicles found.');
      loggerSpy.mockRestore();
    });
  });

  describe('deleteTelemetryConfig', () => {
    it('should delete telemetry config successfully', async () => {
      const vin = 'VIN123';
      const userId = 'test-user-id';
      const userToken = 'user-access-token';

      mockAuthService.getAccessTokenForUserId.mockResolvedValue(userToken);
      mockAxiosInstance.delete.mockResolvedValueOnce({
        data: { success: true },
      });

      const updateSpy = jest
        .spyOn(service, 'updateVehicleTelemetryStatus')
        .mockResolvedValue(undefined);

      const result = await service.deleteTelemetryConfig(vin, userId);

      expect(result).toEqual({
        success: true,
        message: 'Telemetry configuration deleted successfully',
      });
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        `/api/1/vehicles/${vin}/fleet_telemetry_config`,
        expect.objectContaining({
          headers: { Authorization: `Bearer ${userToken}` },
        })
      );
      expect(updateSpy).toHaveBeenCalledWith(userId, vin, false);
    });

    it('should handle 404 error gracefully (config already deleted)', async () => {
      const vin = 'VIN123';
      const userId = 'test-user-id';
      const userToken = 'user-access-token';

      mockAuthService.getAccessTokenForUserId.mockResolvedValue(userToken);
      mockAxiosInstance.delete.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not Found',
      });

      const updateSpy = jest
        .spyOn(service, 'updateVehicleTelemetryStatus')
        .mockResolvedValue(undefined);

      const loggerSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();

      const result = await service.deleteTelemetryConfig(vin, userId);

      expect(result).toEqual({
        success: true,
        message: 'No telemetry configuration found (already deleted)',
      });
      expect(updateSpy).toHaveBeenCalledWith(userId, vin, false);
      expect(loggerSpy).toHaveBeenCalledWith(
        `ℹ️ No configuration found for ${vin} (already deleted)`
      );
      loggerSpy.mockRestore();
    });

    it('should return error on API failure', async () => {
      const vin = 'VIN123';
      const userId = 'test-user-id';
      const userToken = 'user-access-token';

      mockAuthService.getAccessTokenForUserId.mockResolvedValue(userToken);
      mockAxiosInstance.delete.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 500, data: { error: 'Internal Server Error' } },
        message: 'Server Error',
      });

      const loggerSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      const result = await service.deleteTelemetryConfig(vin, userId);

      expect(result).toEqual({
        success: false,
        message: 'Error deleting telemetry configuration',
      });
      expect(loggerSpy).toHaveBeenCalledWith(
        `❌ Error deleting config for ${vin}:`,
        { error: 'Internal Server Error' }
      );
      loggerSpy.mockRestore();
    });

    it('should handle unauthorized error', async () => {
      const vin = 'VIN123';
      const userId = 'test-user-id';

      mockAuthService.getAccessTokenForUserId.mockResolvedValue(null);

      const loggerSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      const result = await service.deleteTelemetryConfig(vin, userId);

      expect(result).toEqual({
        success: false,
        message: 'Error deleting telemetry configuration',
      });
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });
});
