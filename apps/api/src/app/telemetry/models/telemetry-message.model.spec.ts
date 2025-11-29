import 'reflect-metadata';
import { plainToClass } from 'class-transformer';
import { TelemetryMessage, SentryModeState } from './telemetry-message.model';

describe('TelemetryMessage Model', () => {
  describe('ValidatedTelemetryMessage', () => {
    it('should validate message containing SentryMode', () => {
      const message = plainToClass(TelemetryMessage, {
        data: [{ key: 'SentryMode', value: { stringValue: 'Off' } }],
        createdAt: '2025-11-26T16:57:07.330713028Z',
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      });

      const hasSentryMode = message.validateContainsSentryMode();

      expect(hasSentryMode).toBe(true);
    });

    it('should reject message without SentryMode', () => {
      const message = plainToClass(TelemetryMessage, {
        data: [{ key: 'OtherField', value: { stringValue: 'value' } }],
        createdAt: '2025-11-26T16:57:07.330713028Z',
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      });

      const hasSentryMode = message.validateContainsSentryMode();

      expect(hasSentryMode).toBe(false);
    });

    it('should validate SentryMode with valid string value', () => {
      const message = plainToClass(TelemetryMessage, {
        data: [{ key: 'SentryMode', value: { stringValue: 'Off' } }],
        createdAt: '2025-11-26T16:57:07.330713028Z',
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      });

      const isValid = message.validateSentryModeValue();

      expect(isValid).toBe(true);
    });

    it('should reject SentryMode with invalid string value', () => {
      const message = plainToClass(TelemetryMessage, {
        data: [{ key: 'SentryMode', value: { stringValue: 'Invalid' } }],
        createdAt: '2025-11-26T16:57:07.330713028Z',
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      });

      const isValid = message.validateSentryModeValue();

      expect(isValid).toBe(false);
    });

    it('should handle SentryMode with null stringValue', () => {
      const message = plainToClass(TelemetryMessage, {
        data: [{ key: 'SentryMode', value: { stringValue: null } }],
        createdAt: '2025-11-26T16:57:07.330713028Z',
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      });

      const isValid = message.validateSentryModeValue();

      expect(isValid).toBe(false);
    });

    it('should handle SentryMode with undefined stringValue', () => {
      const message = plainToClass(TelemetryMessage, {
        data: [{ key: 'SentryMode', value: {} }],
        createdAt: '2025-11-26T16:57:07.330713028Z',
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      });

      const isValid = message.validateSentryModeValue();

      expect(isValid).toBe(false);
    });


    it('should return false when validateSentryModeValue is called on message without SentryMode', () => {
      const message = plainToClass(TelemetryMessage, {
        data: [{ key: 'OtherField', value: { stringValue: 'value' } }],
        createdAt: '2025-11-26T16:57:07.330713028Z',
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      });

      const isValid = message.validateSentryModeValue();

      expect(isValid).toBe(false);
    });

    it('should validate SentryMode with sentryModeStateValue enum', () => {
      const message = plainToClass(TelemetryMessage, {
        data: [{ key: 'SentryMode', value: { sentryModeStateValue: SentryModeState.Off } }],
        createdAt: '2025-11-26T16:57:07.330713028Z',
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      });

      const hasSentryMode = message.validateContainsSentryMode();
      const isValid = message.validateSentryModeValue();

      expect(hasSentryMode).toBe(true);
      expect(isValid).toBe(true);
    });

    it('should validate SentryMode with sentryModeStateValue raw string (mapped)', () => {
      const message = plainToClass(TelemetryMessage, {
        data: [{ key: 'SentryMode', value: { sentryModeStateValue: SentryModeState.Off } }],
        createdAt: '2025-11-26T16:57:07.330713028Z',
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      });

      const isValid = message.validateSentryModeValue();

      expect(isValid).toBe(true);
    });

    it('should reject SentryMode with invalid sentryModeStateValue raw string', () => {
      const message = plainToClass(TelemetryMessage, {
        data: [{ key: 'SentryMode', value: { sentryModeStateValue: 'InvalidState' } }],
        createdAt: '2025-11-26T16:57:07.330713028Z',
        vin: 'LRWRGCEGXHR312345',
        isResend: false
      });

      const isValid = message.validateSentryModeValue();

      expect(isValid).toBe(false);
    });
  });

});
