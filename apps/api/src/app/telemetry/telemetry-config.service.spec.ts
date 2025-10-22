import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryConfigService } from './telemetry-config.service';
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

describe('TelemetryConfigService', () => {
  let service: TelemetryConfigService;

  beforeEach(async () => {
    // Set up environment variables before creating the module
    process.env.ACCESS_TOKEN = 'test_access_token';
    process.env.LETS_ENCRYPT_CERTIFICATE = Buffer.from('test_certificate').toString('base64');
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelemetryConfigService],
    }).compile();

    service = module.get<TelemetryConfigService>(TelemetryConfigService);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.ACCESS_TOKEN;
    delete process.env.LETS_ENCRYPT_CERTIFICATE;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getVehicles', () => {
    it('should return vehicles list successfully', async () => {
      const mockVehicles = [
        { vin: 'VIN123', display_name: 'Tesla Model 3' },
        { vin: 'VIN456', display_name: 'Tesla Model Y' }
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { response: mockVehicles }
      });

      const result = await service.getVehicles();

      expect(result).toEqual(mockVehicles);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/1/vehicles',
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer test_access_token' }
        })
      );
    });

    it('should return empty array on error', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.getVehicles();

      expect(result).toEqual([]);
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });

  describe('configureTelemetry', () => {
    it('should configure telemetry successfully', async () => {
      const vin = 'TEST_VIN_123';
      const mockResponse = { success: true };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockResponse
      });

      const result = await service.configureTelemetry(vin);

      expect(result).toEqual(mockResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/1/vehicles/fleet_telemetry_config',
        expect.objectContaining({
          config: expect.objectContaining({
            ca: 'test_certificate',
            hostname: 'sentryguard.org',
            port: 12345,
            fields: {
              SentryMode: { interval_seconds: 30 }
            }
          }),
          vins: [vin]
        }),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test_access_token',
            'Content-Type': 'application/json'
          }
        })
      );
    });

    it('should return null when LETS_ENCRYPT_CERTIFICATE is not defined', async () => {
      delete process.env.LETS_ENCRYPT_CERTIFICATE;
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      const result = await service.configureTelemetry('TEST_VIN_123');

      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith('❌ LETS_ENCRYPT_CERTIFICATE non défini');
      loggerSpy.mockRestore();
    });

    it('should return null when ACCESS_TOKEN is not defined', async () => {
      delete process.env.ACCESS_TOKEN;
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      const result = await service.configureTelemetry('TEST_VIN_123');

      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith('❌ ACCESS_TOKEN non défini');
      loggerSpy.mockRestore();
    });

    it('should handle API errors gracefully', async () => {
      const vin = 'TEST_VIN_123';
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.configureTelemetry(vin);

      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });

  describe('checkTelemetryConfig', () => {
    it('should check telemetry config successfully', async () => {
      const vin = 'TEST_VIN_123';
      const mockConfig = { fields: { SentryMode: { interval_seconds: 30 } } };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { response: mockConfig }
      });

      const result = await service.checkTelemetryConfig(vin);

      expect(result).toEqual(mockConfig);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/api/1/vehicles/${vin}/fleet_telemetry_config`,
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer test_access_token' }
        })
      );
    });

    it('should return null on error', async () => {
      const vin = 'TEST_VIN_123';
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.checkTelemetryConfig(vin);

      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });

  describe('configureAllVehicles', () => {
    it('should configure all vehicles successfully', async () => {
      const mockVehicles = [
        { vin: 'VIN123', display_name: 'Tesla Model 3' },
        { vin: 'VIN456', display_name: 'Tesla Model Y' }
      ];

      // Mock getVehicles
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { response: mockVehicles }
      });

      // Mock configureTelemetry for each vehicle
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { success: true } })
        .mockResolvedValueOnce({ data: { success: true } });

      // Mock checkTelemetryConfig for each vehicle
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: { response: { fields: { SentryMode: { interval_seconds: 30 } } } } })
        .mockResolvedValueOnce({ data: { response: { fields: { SentryMode: { interval_seconds: 30 } } } } });

      await service.configureAllVehicles();

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3); // 1 for getVehicles + 2 for checkTelemetryConfig
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2); // 2 for configureTelemetry
    });

    it('should handle empty vehicles list', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { response: [] }
      });

      const loggerSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      await service.configureAllVehicles();

      expect(loggerSpy).toHaveBeenCalledWith('⚠️ Aucun véhicule trouvé.');
      loggerSpy.mockRestore();
    });

    it('should handle getVehicles error', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('API Error'));

      await service.configureAllVehicles();

      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });
});
