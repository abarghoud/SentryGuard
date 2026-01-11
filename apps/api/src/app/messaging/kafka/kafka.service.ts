import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Kafka, Consumer, KafkaMessage, Batch } from 'kafkajs';
import type { MessageHandler } from './interfaces/message-handler.interface';
import pLimit from 'p-limit';
import { kafkaMessageHandler } from './interfaces/message-handler.interface';
import { RetryManager } from './retry-manager.service';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;
  private readonly kafkaBrokers = process.env.KAFKA_BROKERS || '';
  private readonly kafkaClientId = process.env.KAFKA_CLIENT_ID || 'sentry-guard-api';
  private readonly kafkaGroupId = process.env.KAFKA_GROUP_ID || 'sentry-guard-consumer-group';
  private readonly kafkaTopic = process.env.KAFKA_TOPIC || 'TeslaLogger_V';
  private readonly messageLimit = pLimit(parseInt(process.env.KAFKA_MESSAGE_CONCURRENCY_LIMIT || '10', 10));

  private readonly maxRetries = parseInt(process.env.KAFKA_MAX_RETRIES || '10');
  private readonly baseDelay = parseInt(process.env.KAFKA_RETRY_DELAY || '1000');
  private readonly maxDelay = parseInt(process.env.KAFKA_MAX_RETRY_DELAY || '30000');
  private isConnected = false;

  constructor(
    @Inject(kafkaMessageHandler) private readonly messageHandler: MessageHandler,
    private readonly retryManager: RetryManager
  ) {
    this.kafka = new Kafka({
      clientId: this.kafkaClientId,
      brokers: this.kafkaBrokers.split(',').map(broker => broker.trim()),
      connectionTimeout: 5000,
      requestTimeout: 10000,
    });

    this.consumer = this.kafka.consumer({
      groupId: this.kafkaGroupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      rebalanceTimeout: 60000,
    });
  }

  private async connectWithRetry(): Promise<void> {
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        await this.consumer.connect();
        this.isConnected = true;
        this.logger.log('✅ Kafka connected successfully');
        return;
      } catch (error) {
        attempt++;
        const delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);

        this.logger.warn(
          `❌ Kafka connection attempt ${attempt}/${this.maxRetries} failed:`,
          (error instanceof Error ? error.message : String(error))
        );

        if (attempt < this.maxRetries) {
          this.logger.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to connect to Kafka after ${this.maxRetries} attempts`);
  }

  @Interval(process.env.KAFKA_HEALTH_CHECK_INTERVAL ? parseInt(process.env.KAFKA_HEALTH_CHECK_INTERVAL, 10) : 30000)
  async healthCheck() {
    if (!this.isConnected) return;

    try {
      await this.consumer.describeGroup();
    } catch (error) {
      this.logger.error(
        '🔴 Kafka health check failed, attempting reconnection:',
        (error instanceof Error ? error.message : String(error))
      );
      this.isConnected = false;

      await this.safeExecute(
        () => this.reconnect(),
        '💀 Reconnection failed'
      );
    }
  }

  private async reconnect(): Promise<void> {
    await this.consumer.disconnect();
    await this.connectWithRetry();
    await this.subscribe();
    await this.startConsumer();
  }

  private async startConsumer(): Promise<void> {
    this.logger.log('🎧 Starting message listening...');

    await this.consumer.run({
      autoCommit: true,
      eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
        const batchStartTime = Date.now();
        const batchSize = batch.messages.length;

        await Promise.all(batch.messages.map(message =>
          this.messageLimit(async () => {
            if (!this.isConnected) {
              this.logger.warn('Skipping message processing - Kafka disconnected');
              return;
            }

            try {
              await this.messageHandler.handleMessage(
                message,
                async () => {
                  resolveOffset(message.offset);
                }
              );

              await heartbeat();
            } catch (error) {
              await this.handleMessageFailure(error, message, batch, resolveOffset, heartbeat);
            }
          })
        ));

        const batchProcessingTime = Date.now() - batchStartTime;
        if (batchProcessingTime > 1000) {
          this.logger.warn(`Slow batch: ${batchSize} messages in ${batchProcessingTime}ms`);
        }

        await commitOffsetsIfNecessary();
      },
    });

    this.logger.log('Kafka consumer started successfully');
  }

  private async subscribe(): Promise<void> {
    await this.consumer.subscribe({
      topic: this.kafkaTopic,
      fromBeginning: false,
    });
    this.logger.log('Resubscribed to Kafka topic');
  }

  async onModuleInit() {
    await this.startListening();
  }

  async onModuleDestroy() {
    this.retryManager.stop();
    await this.stopListening();
  }

  private async startListening(): Promise<void> {
    try {
      this.logger.log(`Connecting to Kafka brokers: ${this.kafkaBrokers}`);
      this.logger.log(`Client ID: ${this.kafkaClientId}`);
      this.logger.log(`Group ID: ${this.kafkaGroupId}`);
      this.logger.log(`Topic: ${this.kafkaTopic}`);

      await this.connectWithRetry();
      await this.subscribe();
      await this.startConsumer();
    } catch (error) {
      this.logger.error('Failed to start Kafka consumer:', error);
      throw error;
    }
  }

  private async stopListening() {
    if (this.consumer) {
      this.logger.log('Closing Kafka connection...');
      await this.safeExecute(
        () => this.consumer.disconnect(),
        'Error closing Kafka connection'
      );
      this.logger.log('Kafka connection closed');
    }
  }

  private async handleMessageFailure(
    error: unknown,
    message: KafkaMessage,
    batch: Batch,
    resolveOffset: (offset: string) => void,
    heartbeat: () => Promise<void>
  ): Promise<void> {
    const safeError = this.ensureError(error);
    const correlationId = `kafka-${batch.topic}-${batch.partition}-${message.offset}-${Date.now()}`;

    await this.safeExecute(
      () => this.retryManager.addToRetry(
        async () => {
          await this.messageHandler.handleMessage(
            message,
            async () => {
              resolveOffset(message.offset);
            }
          );
        },
        safeError,
        correlationId
      ),
      `[KAFKA_RETRY_SETUP_FAILED][${correlationId}] Failed to setup retry`
    );

    await this.safeExecute(
      () => resolveOffset(message.offset),
      `[KAFKA_OFFSET_COMMIT_FAILED][${correlationId}] Failed to commit offset`
    );

    await this.safeExecute(
      () => heartbeat(),
      `[KAFKA_HEARTBEAT_FAILED][${correlationId}] Failed to send heartbeat`
    );
  }

  private async safeExecute<T>(
    operation: () => T | Promise<T>,
    errorMessage: string
  ): Promise<void> {
    try {
      await operation();
    } catch (error) {
      this.logger.error(
        `${errorMessage}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private ensureError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    return new Error(`Unknown error: ${String(error)}`);
  }
}
