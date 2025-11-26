import { Injectable, Logger, Inject } from '@nestjs/common';
import { MessageHandler } from '../../messaging/kafka/interfaces/message-handler.interface';
import { TelemetryEventHandler, TelemetryEventHandlerSymbol } from '../interfaces/telemetry-event-handler.interface';
import { KafkaMessage } from 'kafkajs';
import { TelemetryValidationService } from '../services/telemetry-validation.service';
import { TelemetryMessage } from '../models/telemetry-message.model';

@Injectable()
export class TelemetryMessageHandlerService implements MessageHandler {
  private readonly logger = new Logger(TelemetryMessageHandlerService.name);

  constructor(
    @Inject(TelemetryEventHandlerSymbol)
    private readonly eventHandlers: TelemetryEventHandler[],
    private readonly validationService: TelemetryValidationService
  ) {}

  async handleMessage(
    message: KafkaMessage,
    commit: () => Promise<void>
  ): Promise<void> {
    try {
      const messageValue = message.value?.toString();
      if (!messageValue) {
        this.logger.warn('Kafka message without content');
        return;
      }

      const rawMessage = JSON.parse(messageValue);
      const validationResult = await this.validationService.validateMessage(rawMessage);

      if (!validationResult.isValidMessage) {
        this.logger.error('Invalid telemetry message structure:', validationResult.errors);
        throw new Error(`Invalid telemetry message structure: ${validationResult.errors.join(', ')}`);
      }

      const telemetryMessage = validationResult.telemetryMessage;
      this.logger.log('Telemetry message structure validated successfully, dispatching to handlers', telemetryMessage);

      await this.dispatchTelemetryEvents(telemetryMessage);
      await commit();

      this.logger.log(`Message processed successfully - Offset: ${message.offset}`);
    } catch (error) {
      this.logger.error('Error processing Kafka message, not committed:', error);
      this.logger.error(`Error message - Offset: ${message.offset}`);
      throw error;
    }
  }

  private async dispatchTelemetryEvents(telemetryMessage: TelemetryMessage): Promise<void> {
    this.logger.log(`Processing telemetry data for VIN: ${telemetryMessage.vin}`);

    const results = await Promise.allSettled(
      this.eventHandlers.map(handler => handler.handle(telemetryMessage))
    );

    const failures = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[];

    if (failures.length > 0) {
      failures.forEach((failure, index) => {
        const handlerName = this.eventHandlers[index]?.constructor.name || 'Unknown';
        this.logger.error(`Handler ${handlerName} failed:`, failure.reason);
      });

      throw new Error(`${failures.length} out of ${this.eventHandlers.length} handlers failed`);
    }
  }
}
