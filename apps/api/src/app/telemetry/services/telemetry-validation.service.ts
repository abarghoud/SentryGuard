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

    return structureResult
  }
}
