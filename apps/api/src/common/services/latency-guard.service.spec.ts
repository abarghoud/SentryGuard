import { Logger } from '@nestjs/common';
import { LatencyGuardService } from './latency-guard.service';

describe('The LatencyGuardService class', () => {
  let latencyGuardService: LatencyGuardService;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  const OLD_ENV = process.env;

  beforeEach(() => {
    latencyGuardService = new LatencyGuardService();
    
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultOptions = {
    vin: 'VIN123',
    logContext: 'TEST_CONTEXT',
    envVarThresholdName: 'TEST_LATENCY_THRESHOLD_MS',
    defaultThresholdMs: 60000,
    alertPrefix: 'TEST_LATENCY_ALERT',
    actionName: 'Test action',
  };

  describe('When the createdAt timestamp is invalid', () => {
    it('should log an error and return true', () => {
      const result = latencyGuardService.checkLatency({
        ...defaultOptions,
        createdAt: 'invalid-date',
      });

      expect(result).toBe(true);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `[TEST_CONTEXT] Invalid createdAt timestamp received: "invalid-date"`,
      );
    });
  });

  describe('When the createdAt timestamp is in the future beyond tolerance', () => {
    it('should log an error and return true', () => {
      const futureDate = new Date(Date.now() + 360000).toISOString();
      const result = latencyGuardService.checkLatency({
        ...defaultOptions,
        createdAt: futureDate,
      });

      expect(result).toBe(true);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `[TEST_CONTEXT] Future createdAt timestamp received: "${futureDate}"`,
      );
    });
  });

  describe('When the latency exceeds the threshold', () => {
    it('should log a warning and return true', () => {
      const oldDate = new Date(Date.now() - 100000).toISOString();
      const result = latencyGuardService.checkLatency({
        ...defaultOptions,
        createdAt: oldDate,
      });

      expect(result).toBe(true);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TEST_LATENCY_ALERT] Test action bypassed for VIN VIN123 due to high latency')
      );
    });
  });

  describe('When the latency is within the threshold', () => {
    it('should return false', () => {
      const recentDate = new Date(Date.now() - 1000).toISOString();
      const result = latencyGuardService.checkLatency({
        ...defaultOptions,
        createdAt: recentDate,
      });

      expect(result).toBe(false);
      expect(loggerErrorSpy).not.toHaveBeenCalled();
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('When using a custom environment variable threshold', () => {
    it('should apply the threshold from the environment variable', () => {
      process.env.TEST_LATENCY_THRESHOLD_MS = '1000';
      const date = new Date(Date.now() - 2000).toISOString();
      
      const result = latencyGuardService.checkLatency({
        ...defaultOptions,
        createdAt: date,
      });

      expect(result).toBe(true);
    });
  });
});
