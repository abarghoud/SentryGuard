import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TelemetryConfigService } from './telemetry-config.service';
import { AuthService } from '../auth/auth.service';
import { Vehicle } from '../../entities/vehicle.entity';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the axios instance methods
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
};

mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

// Mock AuthService
const mockAuthService = {
  getAccessTokenForUserId: jest.fn(),
  getAccessToken: jest.fn(), // For backward compatibility
};

// Mock VehicleRepository
const mockVehicleRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

describe('TelemetryConfigService', () => {
  let service: TelemetryConfigService;

  beforeEach(async () => {
    // Set up environment variables before creating the module
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

    // Reset mocks
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

  describe('getAccessToken', () => {
    it('should return user token when userId is provided', async () => {
      const userId = 'test-user-id';
      const userToken = 'user-access-token';
      mockAuthService.getAccessTokenForUserId.mockResolvedValue(userToken);

      const result = await (service as any).getAccessToken(userId);

      expect(result).toBe(userToken);
      expect(mockAuthService.getAccessTokenForUserId).toHaveBeenCalledWith(
        userId
      );
    });

    it('should throw UnauthorizedException when user token is invalid', async () => {
      const userId = 'test-user-id';
      mockAuthService.getAccessTokenForUserId.mockResolvedValue(null);

      await expect((service as any).getAccessToken(userId)).rejects.toThrow(
        'Token invalide ou expiré pour cet utilisateur'
      );
    });
  });

  describe('getVehicles', () => {
    it('should return vehicles with telemetry data when userId is provided', async () => {
      const userId = 'test-user-id';
      const userToken = 'user-access-token';
      const mockVehicles = [
        { vin: 'VIN123', display_name: 'Tesla Model 3' },
        { vin: 'VIN456', display_name: 'Tesla Model Y' },
      ];

      mockAuthService.getAccessTokenForUserId.mockResolvedValue(userToken);
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { response: mockVehicles },
        })
        .mockResolvedValueOnce({
          data: { response: { key_paired: true } },
        });

      const mockDbVehicles = [
        { vin: 'VIN123', telemetry_enabled: true },
        { vin: 'VIN456', telemetry_enabled: false },
      ];

      jest
        .spyOn(service as any, 'syncVehiclesToDatabase')
        .mockResolvedValue(undefined);
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
      const loggerSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.getVehicles('test-user-id');

      expect(result).toEqual([]);
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });

  describe('syncVehiclesToDatabase', () => {
    it('should create new vehicle when it does not exist', async () => {
      const userId = 'test-user-id';
      const teslaVehicles = [
        {
          vin: 'VIN123',
          display_name: 'Tesla Model 3',
          vehicle_state: { car_type: 'model3' },
        },
      ];

      mockVehicleRepository.findOne.mockResolvedValue(null);
      mockVehicleRepository.create.mockReturnValue({} as Vehicle);
      mockVehicleRepository.save.mockResolvedValue({} as Vehicle);

      await (service as any).syncVehiclesToDatabase(userId, teslaVehicles);

      expect(mockVehicleRepository.findOne).toHaveBeenCalledWith({
        where: { userId, vin: 'VIN123' },
      });
      expect(mockVehicleRepository.create).toHaveBeenCalledWith({
        userId,
        vin: 'VIN123',
        display_name: 'Tesla Model 3',
        model: 'model3',
        telemetry_enabled: false,
      });
      expect(mockVehicleRepository.save).toHaveBeenCalled();
    });

    it('should update display_name when it changes', async () => {
      const userId = 'test-user-id';
      const teslaVehicles = [{ vin: 'VIN123', display_name: 'Updated Name' }];

      const existingVehicle = {
        display_name: 'Old Name',
      };

      mockVehicleRepository.findOne.mockResolvedValue(existingVehicle);
      mockVehicleRepository.save.mockResolvedValue(existingVehicle);

      await (service as any).syncVehiclesToDatabase(userId, teslaVehicles);

      expect(existingVehicle.display_name).toBe('Updated Name');
      expect(mockVehicleRepository.save).toHaveBeenCalledWith(existingVehicle);
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
        { vin: 'VIN123', display_name: 'Tesla Model 3' },
        { vin: 'VIN456', display_name: 'Tesla Model Y' },
      ];

      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { response: mockVehicles },
        })
        .mockResolvedValueOnce({
          data: { response: { key_paired: true } },
        })
        .mockResolvedValueOnce({
          data: { response: { fields: {} } },
        })
        .mockResolvedValueOnce({
          data: { response: { fields: {} } },
        });

      jest
        .spyOn(service as any, 'syncVehiclesToDatabase')
        .mockResolvedValue(undefined);
      jest.spyOn(service as any, 'getUserVehiclesFromDB').mockResolvedValue([]);

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { success: true } })
        .mockResolvedValueOnce({ data: { success: true } });

      await service.configureAllVehicles(userId);

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(4);
    });

    it('should handle empty vehicles list', async () => {
      const userId = 'test-user-id';
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { response: [] },
      });

      const loggerSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();

      await service.configureAllVehicles(userId);

      expect(loggerSpy).toHaveBeenCalledWith('⚠️ Aucun véhicule trouvé.');
      loggerSpy.mockRestore();
    });

    it('should handle getVehicles error', async () => {
      const userId = 'test-user-id';
      mockAuthService.getAccessTokenForUserId.mockResolvedValue('some-token');
      const loggerSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('API Error'));

      await service.configureAllVehicles(userId);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Erreur lors de la récupération des véhicules:',
        'API Error'
      );
      loggerSpy.mockRestore();
    });
  });
});
