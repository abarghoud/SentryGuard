import { Injectable, Logger, Inject } from '@nestjs/common';
import { MessageHandler } from '../../messaging/kafka/interfaces/message-handler.interface';
import { TelemetryEventHandler, TelemetryEventHandlerSymbol, TelemetryMessage } from '../interfaces/telemetry-event-handler.interface';
import { KafkaMessage } from 'kafkajs';

@Injectable()
export class TelemetryMessageHandlerService implements MessageHandler {
  private readonly logger = new Logger(TelemetryMessageHandlerService.name);

  constructor(
    @Inject(TelemetryEventHandlerSymbol)
    private readonly eventHandlers: TelemetryEventHandler[]
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

      const telemetryData: TelemetryMessage = JSON.parse(messageValue);

      await this.dispatchTelemetryEvents(telemetryData);

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

    const handlerPromises = this.eventHandlers.map(handler =>
      handler.handle(telemetryMessage).catch(error => {
        this.logger.error(`Handler ${handler.constructor.name} failed:`, error);
        throw error;
      })
    );

    await Promise.all(handlerPromises);
  }
}
