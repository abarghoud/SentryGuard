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
    const parseStart = Date.now();
    const rawMessage = this.parseMessage(message);
    if (!rawMessage) return;
    const parseTime = Date.now() - parseStart;

    const correlationId = this.enrichMessageWithCorrelationId(rawMessage, message.offset);
    
    const validateStart = Date.now();
    const telemetryMessage = await this.validateMessage(rawMessage);
    const validateTime = Date.now() - validateStart;
    
    const dispatchStart = Date.now();
    await this.dispatchTelemetryEvents(telemetryMessage);
    const dispatchTime = Date.now() - dispatchStart;
    
    const commitStart = Date.now();
    await commit();
    const commitTime = Date.now() - commitStart;
    
    const totalProcessingTime = Date.now() - startTime;
    this.logLatencyIfNeeded(telemetryMessage, correlationId, startTime, {
      parseTime,
      validateTime,
      dispatchTime,
      commitTime,
      totalProcessingTime,
    });
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
    startTime: number,
    timings: {
      parseTime: number;
      validateTime: number;
      dispatchTime: number;
      commitTime: number;
      totalProcessingTime: number;
    }
  ): void {
    const latency = message.calculateEndToEndLatency();
    if (latency === null) return;

    const kafkaDelay = startTime - new Date(message.createdAt).getTime();
    const { parseTime, validateTime, dispatchTime, commitTime, totalProcessingTime } = timings;

    if (totalProcessingTime > 1000) {
      this.logger.warn(
        `[LATENCY][${correlationId}] Slow: ${latency}ms total | ` +
        `Processing: ${totalProcessingTime}ms (parse:${parseTime}ms validate:${validateTime}ms dispatch:${dispatchTime}ms commit:${commitTime}ms) | ` +
        `Kafka delay: ${kafkaDelay}ms`
      );
    } else if (totalProcessingTime > 500) {
      this.logger.log(
        `[LATENCY][${correlationId}] ${latency}ms total | ` +
        `Processing: ${totalProcessingTime}ms (parse:${parseTime}ms validate:${validateTime}ms dispatch:${dispatchTime}ms commit:${commitTime}ms) | ` +
        `Kafka: ${kafkaDelay}ms`
      );
    } else {
      this.logger.log(`[LATENCY][${correlationId}] ${latency}ms (Kafka: ${kafkaDelay}ms, Processing: ${totalProcessingTime}ms)`);
    }
  }

  private async dispatchTelemetryEvents(telemetryMessage: TelemetryMessage): Promise<void> {
    this.logger.log(`Processing telemetry data for VIN: ${telemetryMessage.vin}`, telemetryMessage);

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
