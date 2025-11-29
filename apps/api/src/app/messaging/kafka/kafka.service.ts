import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import type { MessageHandler } from './interfaces/message-handler.interface';
import { kafkaMessageHandler } from './interfaces/message-handler.interface';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;
  private readonly kafkaBrokers = process.env.KAFKA_BROKERS || '';
  private readonly kafkaClientId = process.env.KAFKA_CLIENT_ID || 'sentry-guard-api';
  private readonly kafkaGroupId = process.env.KAFKA_GROUP_ID || 'sentry-guard-consumer-group';
  private readonly kafkaTopic = process.env.KAFKA_TOPIC || 'TeslaLogger_V';

  private readonly maxRetries = parseInt(process.env.KAFKA_MAX_RETRIES || '10');
  private readonly baseDelay = parseInt(process.env.KAFKA_RETRY_DELAY || '1000');
  private readonly maxDelay = parseInt(process.env.KAFKA_MAX_RETRY_DELAY || '30000');
  private isConnected = false;

  constructor(
    @Inject(kafkaMessageHandler) private readonly messageHandler: MessageHandler
  ) {
    this.kafka = new Kafka({
      clientId: this.kafkaClientId,
      brokers: this.kafkaBrokers.split(',').map(broker => broker.trim()),
      connectionTimeout: 5000,
      requestTimeout: 10000,
    });

    this.consumer = this.kafka.consumer({
      groupId: this.kafkaGroupId,
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

      try {
        await this.reconnect();
      } catch (reconnectError) {
        this.logger.error(
          '💀 Reconnection failed:',
           (reconnectError instanceof Error ? reconnectError.message : String(reconnectError))
        );
      }
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
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        if (!this.isConnected) {
          this.logger.warn('⚠️ Skipping message processing - Kafka disconnected');
          return;
        }

        try {
          await this.messageHandler.handleMessage(
            message,
            async () => {
              await this.consumer.commitOffsets([{
                topic,
                partition,
                offset: (parseInt(message.offset) + 1).toString()
              }]);
            }
          );
        } catch (error) {
          this.logger.error(`💥 Error processing message ${message.offset}:`, error);
        }
      },
    });

    this.logger.log('🎉 Kafka consumer started successfully');
  }

  private async subscribe(): Promise<void> {
    await this.consumer.subscribe({
      topic: this.kafkaTopic,
      fromBeginning: false,
    });
    this.logger.log('📡 Resubscribed to Kafka topic');
  }

  async onModuleInit() {
    await this.startListening();
  }

  async onModuleDestroy() {
    await this.stopListening();
  }

  private async startListening(): Promise<void> {
    try {
      this.logger.log(`🔌 Connecting to Kafka brokers: ${this.kafkaBrokers}`);
      this.logger.log(`Client ID: ${this.kafkaClientId}`);
      this.logger.log(`Group ID: ${this.kafkaGroupId}`);
      this.logger.log(`Topic: ${this.kafkaTopic}`);

      await this.connectWithRetry();
      await this.subscribe();
      await this.startConsumer();
    } catch (error) {
      this.logger.error('💀 Failed to start Kafka consumer:', error);
      throw error;
    }
  }

  private async stopListening() {
    try {
      if (this.consumer) {
        this.logger.log('Closing Kafka connection...');
        await this.consumer.disconnect();
        this.logger.log('Kafka connection closed');
      }
    } catch (error) {
      this.logger.error('Error closing Kafka connection:', error);
    }
  }
}
