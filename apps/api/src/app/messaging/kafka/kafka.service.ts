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
import { RetryManager } from '../../shared/retry-manager.service';
import { KafkaConfigFactory } from './kafka-config.factory';
import { LogFlushService } from '../../../common/services/log-flush.service';

const exitLogFlushTimeoutMs = 2000;

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
  private readonly healthCheckMaxFailures = KafkaService.readPositiveInt('KAFKA_HEALTH_CHECK_MAX_FAILURES', 4);
  private readonly healthCheckTimeoutMs = KafkaService.readPositiveInt('KAFKA_HEALTH_CHECK_TIMEOUT_MS', 10000);
  private readonly livenessMaxIdleMs = KafkaService.readPositiveInt('KAFKA_LIVENESS_MAX_IDLE_MS', 120000);
  private isConnected = false;
  private isShuttingDown = false;
  private isExiting = false;
  private consecutiveHealthFailures = 0;
  private healthCheckInFlight = false;
  private lastActivityAt = Date.now();
  private inFlightCount = 0;
  private readonly drainWaiters: Array<() => void> = [];

  constructor(
    @Inject(kafkaMessageHandler) private readonly messageHandler: MessageHandler,
    private readonly retryManager: RetryManager,
    private readonly logFlushService: LogFlushService
  ) {
    this.kafka = new Kafka(KafkaConfigFactory.createKafkaConfig());

    this.consumer = this.kafka.consumer({
      groupId: this.kafkaGroupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      rebalanceTimeout: 60000,
    });

    if (this.consumer.events) {
      this.consumer.on(this.consumer.events.CRASH, async (event) => {
        this.logger.error('💥 Kafka consumer crashed:', event.payload.error);
        this.isConnected = false;
        if (!event.payload.restart) {
          await this.exitForRestart(
            '[KAFKA_CRASH_FATAL] non-retriable crash, exiting',
            this.ensureError(event.payload.error).message
          );
        }
      });

      this.consumer.on(this.consumer.events.DISCONNECT, () => {
        this.logger.warn('🔌 Kafka consumer disconnected');
        this.isConnected = false;
      });

      this.consumer.on(this.consumer.events.GROUP_JOIN, () => {
        this.logger.log('👥 Kafka consumer joined group');
        this.isConnected = true;
        this.markActivity();
      });

      this.consumer.on(this.consumer.events.HEARTBEAT, () => this.markActivity());
      this.consumer.on(this.consumer.events.FETCH_START, () => this.markActivity());
    }
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
  async healthCheck(): Promise<void> {
    if (this.isShuttingDown || this.healthCheckInFlight) return;

    this.healthCheckInFlight = true;

    try {
      const failureReason = await this.findHealthFailure();

      if (failureReason) {
        await this.recordHealthFailure(failureReason);
      } else {
        this.recordHealthSuccess();
      }
    } finally {
      this.healthCheckInFlight = false;
    }
  }

  private async findHealthFailure(): Promise<string | null> {
    if (!this.isConnected) {
      return 'consumer is not connected to the group';
    }

    const idleMs = Date.now() - this.lastActivityAt;
    if (idleMs > this.livenessMaxIdleMs) {
      return `no heartbeat or fetch for ${idleMs}ms`;
    }

    try {
      await this.describeGroupWithTimeout();
      return null;
    } catch (error) {
      return `describeGroup failed: ${this.ensureError(error).message}`;
    }
  }

  private async describeGroupWithTimeout(): Promise<void> {
    let timeoutId: NodeJS.Timeout | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`timed out after ${this.healthCheckTimeoutMs}ms`)),
        this.healthCheckTimeoutMs
      );
    });

    try {
      await Promise.race([this.consumer.describeGroup(), timeout]);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async recordHealthFailure(reason: string): Promise<void> {
    this.consecutiveHealthFailures++;
    this.logger.warn(
      `[KAFKA_HEALTH] failure ${this.consecutiveHealthFailures}/${this.healthCheckMaxFailures}: ${reason}`
    );

    if (this.consecutiveHealthFailures >= this.healthCheckMaxFailures) {
      await this.exitForRestart(`[KAFKA_HEALTH_FATAL] ${reason}, exiting for container restart`);
    }
  }

  private recordHealthSuccess(): void {
    if (this.consecutiveHealthFailures > 0) {
      this.logger.log(`[KAFKA_HEALTH] recovered after ${this.consecutiveHealthFailures} failure(s)`);
    }

    this.consecutiveHealthFailures = 0;
  }

  private markActivity(): void {
    this.lastActivityAt = Date.now();
  }

  private async exitForRestart(message: string, detail?: string): Promise<void> {
    if (this.isExiting) return;

    this.isExiting = true;
    this.logFatal(message, detail);

    try {
      await this.flushLogsBeforeExit();
    } finally {
      process.exit(1);
    }
  }

  private logFatal(message: string, detail?: string): void {
    if (detail) {
      this.logger.fatal(message, detail);
    } else {
      this.logger.fatal(message);
    }
  }

  private async flushLogsBeforeExit(): Promise<void> {
    try {
      await this.flushLogsWithTimeout();
    } catch (error) {
      this.logger.error(
        '[KAFKA_EXIT_LOG_FLUSH_FAILED] Failed to flush logs before exit:',
        this.ensureError(error).message
      );
    }
  }

  private async flushLogsWithTimeout(): Promise<void> {
    let timeoutId: NodeJS.Timeout | undefined;

    const timeout = new Promise<void>((resolve) => {
      timeoutId = setTimeout(resolve, exitLogFlushTimeoutMs);
    });

    try {
      await Promise.race([this.logFlushService.flush(), timeout]);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private static readPositiveInt(name: string, defaultValue: number): number {
    const value = parseInt(process.env[name] || '', 10);
    return Number.isFinite(value) && value > 0 ? value : defaultValue;
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
            this.incrementInFlight();

            try {
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
            } finally {
              this.decrementInFlight();
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

  public isKafkaConnected(): boolean {
    return this.isConnected;
  }

  async onModuleInit() {
    await this.startListening();
  }

  async onModuleDestroy() {
    this.retryManager.stop();
    await this.stopListening();
  }

  public async pauseConsumer(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.logger.log('⏸️ Pausing Kafka consumer for graceful shutdown');

    await this.safeExecute(
      () => this.consumer.pause([{ topic: this.kafkaTopic }]),
      'Error pausing Kafka consumer'
    );
  }

  public async drainInFlight(timeoutMs: number): Promise<void> {
    if (this.inFlightCount === 0) {
      return;
    }

    this.logger.log(`⏳ Waiting for ${this.inFlightCount} in-flight Kafka message(s) to complete...`);

    let timeoutId: NodeJS.Timeout | undefined;

    const drained = new Promise<void>((resolve) => {
      this.drainWaiters.push(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve();
      });
    });

    const timeout = new Promise<void>((resolve) => {
      timeoutId = setTimeout(() => {
        this.logger.warn(`Graceful shutdown Kafka drain timed out after ${timeoutMs}ms (${this.inFlightCount} in-flight)`);
        resolve();
      }, timeoutMs);
    });

    await Promise.race([drained, timeout]);

    if (this.inFlightCount === 0) {
      this.logger.log('✅ Kafka in-flight messages drained');
    }
  }

  private incrementInFlight(): void {
    this.inFlightCount++;
  }

  private decrementInFlight(): void {
    this.inFlightCount = Math.max(0, this.inFlightCount - 1);

    if (this.inFlightCount === 0) {
      const waiters = this.drainWaiters.splice(0);
      waiters.forEach((waiter) => waiter());
    }
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
