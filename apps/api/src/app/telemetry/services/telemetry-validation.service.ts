import { Injectable, Logger } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { TelemetryMessage } from '../models/telemetry-message.model';

export interface ValidationResult {
  errors: string[];
  isValidMessage: boolean;
  telemetryMessage: TelemetryMessage;
}

@Injectable()
export class TelemetryValidationService {
  private readonly logger = new Logger(TelemetryValidationService.name);

  async validateMessageStructure(message: any): Promise<ValidationResult> {
    try {
      const telemetryMessage = plainToInstance(TelemetryMessage, message);
      const validationErrors = await validate(telemetryMessage);

      if (validationErrors.length > 0) {
        const errors = validationErrors.map(err => {
          return Object.values(err.constraints || {}).join(', ');
        });

        return {
          isValidMessage: false,
          errors,
          telemetryMessage: plainToInstance(TelemetryMessage, {})
        };
      }

      return {
        errors: [],
        isValidMessage: true,
        telemetryMessage,
      };
    } catch (error) {
      this.logger.error('Error during structure validation:', error);
      return {
        isValidMessage: false,
        errors: ['Structure validation failed'],
        telemetryMessage: plainToInstance(TelemetryMessage, {})
      };
    }
  }

  async validateMessage(message: any): Promise<ValidationResult> {
    const structureResult = await this.validateMessageStructure(message);
    if (!structureResult.isValidMessage) {
      return structureResult;
    }

    const { telemetryMessage } = structureResult;
    const errors: string[] = [];

    // Verify createdAt timestamp bounding (reject if too old or in the future)
    try {
      const msgTime = new Date(telemetryMessage.createdAt).getTime();
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const fiveMinsMs = 5 * 60 * 1000;

      if (isNaN(msgTime)) {
        errors.push('createdAt is not a valid date');
      } else if (now - msgTime > oneDayMs) {
        errors.push('createdAt is too old (greater than 24 hours)');
      } else if (msgTime - now > fiveMinsMs) {
        errors.push('createdAt is in the future');
      }
    } catch {
      errors.push('createdAt is invalid');
    }

    if (errors.length > 0) {
      return {
        isValidMessage: false,
        errors,
        telemetryMessage: plainToInstance(TelemetryMessage, {}),
      };
    }

    return structureResult;
  }
}
