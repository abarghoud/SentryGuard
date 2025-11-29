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
        createdAt: '2025-11-26T16:57:07.330713028Z',
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
        createdAt: '2025-11-26T16:57:07.330713028Z',
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      };

      const result = await service.validateMessageStructure(invalidMessage);

      expect(result.isValidMessage).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject message with invalid createdAt', async () => {
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
    it('should validate complete valid message', async () => {
      const validMessage = {
        data: [{ key: 'SentryMode', value: { stringValue: 'Off' } }],
        createdAt: '2025-11-26T16:57:07.330713028Z',
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
        createdAt: '2025-11-26T16:57:07.330713028Z',
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      };

      const result = await service.validateMessage(invalidMessage);

      expect(result.isValidMessage).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
