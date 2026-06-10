import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryValidationService } from './telemetry-validation.service';

describe('TelemetryValidationService', () => {
  let service: TelemetryValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelemetryValidationService],
    }).compile();

    service = module.get<TelemetryValidationService>(TelemetryValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateMessageStructure', () => {
    it('should validate a valid telemetry message', async () => {
      const validMessage = {
        data: [
          {
            key: 'SentryMode',
            value: { stringValue: 'Off' }
          }
        ],
        createdAt: new Date().toISOString(),
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      };

      const result = await service.validateMessageStructure(validMessage);

      expect(result.isValidMessage).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject message without data', async () => {
      const invalidMessage = {
        data: [],
        createdAt: new Date().toISOString(),
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      };

      const result = await service.validateMessageStructure(invalidMessage);

      expect(result.isValidMessage).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject message with invalid createdAt format', async () => {
      const invalidMessage = {
        data: [{ key: 'SentryMode', value: { stringValue: 'Off' } }],
        createdAt: 'invalid-date',
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      };

      const result = await service.validateMessageStructure(invalidMessage);

      expect(result.isValidMessage).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle null input gracefully', async () => {
      const result = await service.validateMessageStructure(null);

      expect(result.isValidMessage).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Structure validation failed');
    });

    it('should handle undefined input gracefully', async () => {
      const result = await service.validateMessageStructure(undefined);

      expect(result.isValidMessage).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Structure validation failed');
    });

    it('should handle message with missing required fields', async () => {
      const invalidMessage = {
        data: [{ key: 'SentryMode', value: { stringValue: 'Off' } }]
        // Missing createdAt, vin, isResend
      };

      const result = await service.validateMessageStructure(invalidMessage);

      expect(result.isValidMessage).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateMessage', () => {
    it('should validate complete valid message within time bounds', async () => {
      const validMessage = {
        data: [{ key: 'SentryMode', value: { stringValue: 'Off' } }],
        createdAt: new Date().toISOString(),
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      };

      const result = await service.validateMessage(validMessage);

      expect(result.isValidMessage).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject message with invalid structure', async () => {
      const invalidMessage = {
        data: [],
        createdAt: new Date().toISOString(),
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      };

      const result = await service.validateMessage(invalidMessage);

      expect(result.isValidMessage).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject message with a VIN that does not match the 17-character regex', async () => {
      const invalidMessage = {
        data: [{ key: 'SentryMode', value: { stringValue: 'Off' } }],
        createdAt: new Date().toISOString(),
        vin: 'INVALID-VIN',
        isResend: false
      };

      const result = await service.validateMessage(invalidMessage);

      expect(result.isValidMessage).toBe(false);
      expect(result.errors.join(', ')).toContain('VIN');
    });

    it('should reject message with createdAt timestamp too old (> 24 hours)', async () => {
      const tooOldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      const invalidMessage = {
        data: [{ key: 'SentryMode', value: { stringValue: 'Off' } }],
        createdAt: tooOldDate,
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      };

      const result = await service.validateMessage(invalidMessage);

      expect(result.isValidMessage).toBe(false);
      expect(result.errors).toContain('createdAt is too old (greater than 24 hours)');
    });

    it('should reject message with createdAt timestamp in the future (> 5 minutes)', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const invalidMessage = {
        data: [{ key: 'SentryMode', value: { stringValue: 'Off' } }],
        createdAt: futureDate,
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      };

      const result = await service.validateMessage(invalidMessage);

      expect(result.isValidMessage).toBe(false);
      expect(result.errors).toContain('createdAt is in the future');
    });
  });
});
