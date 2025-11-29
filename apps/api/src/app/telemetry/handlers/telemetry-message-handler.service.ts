import { Injectable, Logger, Inject } from '@nestjs/common';
import { MessageHandler } from '../../messaging/kafka/interfaces/message-handler.interface';
import { TelemetryEventHandler, TelemetryEventHandlerSymbol } from '../interfaces/telemetry-event-handler.interface';
import { KafkaMessage } from 'kafkajs';
import { TelemetryValidationService } from '../services/telemetry-validation.service';
import { TelemetryMessage } from '../models/telemetry-message.model';
import { randomBytes } from 'crypto';

interface RawTelemetryMessage {
  vin?: string;
  createdAt?: string;
  correlationId?: string;
  [key: string]: unknown;
}

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
    const startTime = Date.now();
    const rawMessage = this.parseMessage(message);
    if (!rawMessage) return;

    const correlationId = this.enrichMessageWithCorrelationId(rawMessage, message.offset);
    const telemetryMessage = await this.validateMessage(rawMessage);
    
    await this.dispatchTelemetryEvents(telemetryMessage);
    await commit();
    
    this.logLatencyIfNeeded(telemetryMessage, correlationId, startTime);
  }

  private parseMessage(message: KafkaMessage): RawTelemetryMessage | null {
    const messageValue = message.value?.toString();

    if (!messageValue) {
      this.logger.warn(`Kafka message without content - Offset: ${message.offset}`);
      return null;
    }
    
    return JSON.parse(messageValue) as RawTelemetryMessage;
  }

  private enrichMessageWithCorrelationId(rawMessage: RawTelemetryMessage, offset: string): string {
    const correlationId = `offset-${offset}-${rawMessage.vin?.substring(0, 8) || 'unknown'}-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
    rawMessage.correlationId = correlationId;

    this.logger.log(`[AUTO_CORRELATION] ${correlationId} for VIN: ${rawMessage.vin || 'unknown'}`);

    return correlationId;
  }

  private async validateMessage(rawMessage: RawTelemetryMessage): Promise<TelemetryMessage> {
    const result = await this.validationService.validateMessage(rawMessage);

    if (!result.isValidMessage) {
      throw new Error(`Invalid message: ${result.errors.join(', ')}`);
    }

    return result.telemetryMessage;
  }

  private logLatencyIfNeeded(
    message: TelemetryMessage,
    correlationId: string,
    startTime: number
  ): void {
    const latency = message.calculateEndToEndLatency();
    if (latency === null) return;

    const processingTime = Date.now() - startTime;
    const kafkaDelay = startTime - new Date(message.createdAt).getTime();

    if (processingTime > 1000) {
      this.logger.warn(`[LATENCY][${correlationId}] Slow: ${latency}ms (processing: ${processingTime}ms)`);
    } else {
      this.logger.log(`[LATENCY][${correlationId}] ${latency}ms (Kafka: ${kafkaDelay}ms, Processing: ${processingTime}ms)`);
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
