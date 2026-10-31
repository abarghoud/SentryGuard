import { Logger } from '@nestjs/common';
import { Batch, Consumer, ConsumerRunConfig, EachBatchHandler, EachBatchPayload } from 'kafkajs';
import { mock, MockProxy } from 'jest-mock-extended';
import { KafkaService } from './kafka.service';
import { MessageHandler } from './interfaces/message-handler.interface';
import { RetryManager } from '../../shared/retry-manager.service';
import { LogFlushService } from '../../../common/services/log-flush.service';

const EVENTS = {
  CRASH: 'consumer.crash',
  DISCONNECT: 'consumer.disconnect',
  GROUP_JOIN: 'consumer.group_join',
  HEARTBEAT: 'consumer.heartbeat',
  FETCH_START: 'consumer.fetch_start',
} as const;

type ConsumerEventName = keyof typeof EVENTS;
type ConsumerListener = (event?: unknown) => unknown;

let mockConsumer: MockProxy<Consumer>;

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: () => mockConsumer,
  })),
}));

const mockMessageHandler = mock<MessageHandler>();
const mockRetryManager = mock<RetryManager>();
const mockLogFlushService = mock<LogFlushService>();

const listeners = new Map<string, ConsumerListener>();

const createConsumerDouble = (): MockProxy<Consumer> => {
  const consumer = mock<Consumer>({
    events: EVENTS as unknown as Consumer['events'],
  });

  consumer.connect.mockResolvedValue(undefined);
  consumer.subscribe.mockResolvedValue(undefined);
  consumer.run.mockResolvedValue(undefined);
  consumer.disconnect.mockResolvedValue(undefined);
  consumer.describeGroup.mockResolvedValue({} as Awaited<ReturnType<Consumer['describeGroup']>>);
  consumer.on.mockImplementation(((eventName: string, listener: ConsumerListener) => {
    listeners.set(eventName, listener);
    return () => listeners.delete(eventName);
  }) as Consumer['on']);

  return consumer;
};

const emit = async (eventName: ConsumerEventName, payload?: unknown): Promise<void> => {
  const listener = listeners.get(EVENTS[eventName]);
  if (!listener) {
    throw new Error(`No listener registered for ${eventName}`);
  }
  await listener(payload);
};

const createService = (): KafkaService => new KafkaService(mockMessageHandler, mockRetryManager, mockLogFlushService);

const startService = async (service: KafkaService): Promise<void> => {
  await service.onModuleInit();
};

const joinGroup = (): Promise<void> => emit('GROUP_JOIN');

const crash = (error: Error, restart: boolean): Promise<void> =>
  emit('CRASH', { payload: { error, restart } });

const runHealthChecks = async (service: KafkaService, count: number): Promise<void> => {
  for (let i = 0; i < count; i++) {
    await service.healthCheck();
  }
};

const runHealthCheckUntilTimeout = async (service: KafkaService, timeoutMs: number): Promise<void> => {
  const check = service.healthCheck();
  await jest.advanceTimersByTimeAsync(timeoutMs);
  await check;
};

const getEachBatch = (): EachBatchHandler => {
  const runConfig: ConsumerRunConfig | undefined = mockConsumer.run.mock.calls[0]?.[0];
  if (!runConfig?.eachBatch) {
    throw new Error('consumer.run was not called with an eachBatch handler');
  }
  return runConfig.eachBatch;
};

const createTestBatch = (): Batch => ({
  topic: 'TeslaLogger_V',
  partition: 0,
  messages: [{
    offset: '100',
    value: Buffer.from('test message'),
    key: null,
    timestamp: '1234567890',
    attributes: 0,
    headers: {},
  }],
  highWatermark: '200',
  isEmpty: jest.fn().mockReturnValue(false),
  firstOffset: jest.fn().mockReturnValue('100'),
  lastOffset: jest.fn().mockReturnValue('100'),
  offsetLag: jest.fn().mockReturnValue('100'),
  offsetLagLow: jest.fn().mockReturnValue('100'),
});

const createEachBatchPayload = (
  batch: Batch,
  overrides: Partial<EachBatchPayload> = {}
): EachBatchPayload => ({
  batch,
  resolveOffset: jest.fn(),
  heartbeat: jest.fn().mockResolvedValue(undefined),
  commitOffsetsIfNecessary: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockReturnValue(jest.fn()),
  isRunning: jest.fn().mockReturnValue(true),
  isStale: jest.fn().mockReturnValue(false),
  uncommittedOffsets: jest.fn().mockReturnValue({ topics: [] }),
  ...overrides,
});

const HEALTH_ENV_VARS = [
  'KAFKA_HEALTH_CHECK_MAX_FAILURES',
  'KAFKA_HEALTH_CHECK_TIMEOUT_MS',
  'KAFKA_LIVENESS_MAX_IDLE_MS',
];

describe('The KafkaService class', () => {
  let service: KafkaService;
  let exitSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let fatalSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    listeners.clear();
    mockMessageHandler.handleMessage.mockResolvedValue(undefined);
    mockLogFlushService.flush.mockResolvedValue(undefined);

    process.env.KAFKA_BROKERS = '10.0.2.15:9092';
    process.env.KAFKA_CLIENT_ID = 'tesla-guard-api';
    process.env.KAFKA_GROUP_ID = 'tesla-guard-consumer-group';
    process.env.KAFKA_TOPIC = 'TeslaLogger_V';

    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    fatalSpy = jest.spyOn(Logger.prototype, 'fatal').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    mockConsumer = createConsumerDouble();
    service = createService();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete process.env.KAFKA_BROKERS;
    delete process.env.KAFKA_CLIENT_ID;
    delete process.env.KAFKA_GROUP_ID;
    delete process.env.KAFKA_TOPIC;
    HEALTH_ENV_VARS.forEach((name) => delete process.env[name]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('The onModuleInit method', () => {
    it('should start listening when module initializes', async () => {
      await startService(service);

      expect(mockConsumer.connect).toHaveBeenCalled();
      expect(mockConsumer.subscribe).toHaveBeenCalledWith({
        topic: 'TeslaLogger_V',
        fromBeginning: false,
      });
      expect(mockConsumer.run).toHaveBeenCalled();
    });
  });

  describe('The onModuleDestroy method', () => {
    it('should stop listening when module destroys', async () => {
      await service.onModuleDestroy();

      expect(mockConsumer.disconnect).toHaveBeenCalled();
    });
  });

  describe('The healthCheck method', () => {
    const startHealthyService = async (target: KafkaService): Promise<void> => {
      await startService(target);
      await joinGroup();
    };

    beforeEach(async () => {
      jest.useFakeTimers();
      mockConsumer = createConsumerDouble();
      service = createService();
      await startHealthyService(service);
    });

    it('should describe the group when the consumer is connected and active', async () => {
      await service.healthCheck();

      expect(mockConsumer.describeGroup).toHaveBeenCalledTimes(1);
      expect(exitSpy).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should never disconnect, reconnect or restart the consumer when checks fail', async () => {
      mockConsumer.describeGroup.mockRejectedValue(new Error('Closed connection'));

      await runHealthChecks(service, 4);

      expect(mockConsumer.disconnect).not.toHaveBeenCalled();
      expect(mockConsumer.connect).toHaveBeenCalledTimes(1);
      expect(mockConsumer.subscribe).toHaveBeenCalledTimes(1);
      expect(mockConsumer.run).toHaveBeenCalledTimes(1);
    });

    it('should not exit before the maximum number of consecutive failures', async () => {
      mockConsumer.describeGroup.mockRejectedValue(new Error('Closed connection'));

      await runHealthChecks(service, 3);

      expect(exitSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenLastCalledWith(
        '[KAFKA_HEALTH] failure 3/4: describeGroup failed: Closed connection'
      );
    });

    it('should exit with code 1 after the maximum number of consecutive failures', async () => {
      mockConsumer.describeGroup.mockRejectedValue(new Error('Closed connection'));

      await runHealthChecks(service, 4);

      expect(exitSpy).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(fatalSpy).toHaveBeenCalledWith(
        '[KAFKA_HEALTH_FATAL] describeGroup failed: Closed connection, exiting for container restart'
      );
    });

    it('should reset the failure count after a successful check', async () => {
      mockConsumer.describeGroup
        .mockRejectedValueOnce(new Error('Closed connection'))
        .mockRejectedValueOnce(new Error('Closed connection'));

      await runHealthChecks(service, 3);

      expect(logSpy).toHaveBeenCalledWith('[KAFKA_HEALTH] recovered after 2 failure(s)');

      mockConsumer.describeGroup.mockRejectedValue(new Error('Closed connection'));
      await runHealthChecks(service, 3);

      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should count a describeGroup call that never settles as a failure', async () => {
      mockConsumer.describeGroup.mockReturnValue(new Promise(() => undefined));

      for (let i = 0; i < 4; i++) {
        await runHealthCheckUntilTimeout(service, 10000);
      }

      expect(warnSpy).toHaveBeenCalledWith(
        '[KAFKA_HEALTH] failure 1/4: describeGroup failed: timed out after 10000ms'
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should count a disconnected consumer as a failure without trying to reconnect', async () => {
      await emit('DISCONNECT');

      await runHealthChecks(service, 4);

      expect(mockConsumer.describeGroup).not.toHaveBeenCalled();
      expect(mockConsumer.connect).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should count a consumer without recent heartbeat or fetch as a failure', async () => {
      jest.advanceTimersByTime(120001);

      await service.healthCheck();

      expect(mockConsumer.describeGroup).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        '[KAFKA_HEALTH] failure 1/4: no heartbeat or fetch for 120001ms'
      );
    });

    it('should run only one check at a time', async () => {
      mockConsumer.describeGroup.mockReturnValue(new Promise(() => undefined));

      const firstCheck = service.healthCheck();
      await service.healthCheck();

      expect(mockConsumer.describeGroup).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(10000);
      await firstCheck;
    });

    it('should skip the check during graceful shutdown', async () => {
      await service.pauseConsumer();
      await emit('DISCONNECT');

      await runHealthChecks(service, 4);

      expect(mockConsumer.describeGroup).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should read the thresholds from the environment', async () => {
      process.env.KAFKA_HEALTH_CHECK_MAX_FAILURES = '2';
      process.env.KAFKA_HEALTH_CHECK_TIMEOUT_MS = '500';
      mockConsumer = createConsumerDouble();
      const configuredService = createService();
      await startHealthyService(configuredService);
      mockConsumer.describeGroup.mockReturnValue(new Promise(() => undefined));

      for (let i = 0; i < 2; i++) {
        await runHealthCheckUntilTimeout(configuredService, 500);
      }

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should fall back to the default thresholds when the environment is invalid', async () => {
      process.env.KAFKA_HEALTH_CHECK_MAX_FAILURES = 'abc';
      process.env.KAFKA_LIVENESS_MAX_IDLE_MS = '-5';
      mockConsumer = createConsumerDouble();
      const configuredService = createService();
      await startHealthyService(configuredService);
      mockConsumer.describeGroup.mockRejectedValue(new Error('Closed connection'));
      jest.advanceTimersByTime(60000);

      await runHealthChecks(configuredService, 3);

      expect(mockConsumer.describeGroup).toHaveBeenCalledTimes(3);
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe('The KafkaJS event listeners', () => {
    it('should let KafkaJS restart itself after a retriable crash', async () => {
      await crash(new Error('Connection timeout'), true);

      expect(mockConsumer.disconnect).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should exit with code 1 when KafkaJS gives up after a non-retriable crash', async () => {
      await crash(new Error('Invalid credentials'), false);

      expect(mockConsumer.disconnect).not.toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(fatalSpy).toHaveBeenCalledWith(
        '[KAFKA_CRASH_FATAL] non-retriable crash, exiting',
        'Invalid credentials'
      );
    });

    it('should restore the connected state when the consumer rejoins the group', async () => {
      await startService(service);
      await emit('DISCONNECT');
      await joinGroup();

      await service.healthCheck();

      expect(mockConsumer.describeGroup).toHaveBeenCalled();
      expect(mockConsumer.disconnect).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('[KAFKA_HEALTH]'));
    });

    it.each(['HEARTBEAT', 'FETCH_START'] as const)(
      'should consider the consumer active again on %s',
      async (eventName) => {
        jest.useFakeTimers();
        mockConsumer = createConsumerDouble();
        const activeService = createService();
        await startService(activeService);
        await joinGroup();

        jest.advanceTimersByTime(100000);
        await emit(eventName);
        jest.advanceTimersByTime(100000);

        await activeService.healthCheck();

        expect(mockConsumer.describeGroup).toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
      }
    );
  });

  describe('The exit for container restart', () => {
    const exitAfterNonRetriableCrash = (): Promise<void> =>
      crash(new Error('Invalid credentials'), false);

    it('should flush pending logs before exiting', async () => {
      await exitAfterNonRetriableCrash();

      expect(mockLogFlushService.flush.mock.invocationCallOrder[0]).toBeLessThan(
        exitSpy.mock.invocationCallOrder[0]
      );
    });

    it('should log the fatal line before flushing the logs', async () => {
      await exitAfterNonRetriableCrash();

      expect(fatalSpy.mock.invocationCallOrder[0]).toBeLessThan(
        mockLogFlushService.flush.mock.invocationCallOrder[0]
      );
    });

    it('should not exit while the log flush is still within its timeout', async () => {
      jest.useFakeTimers();
      mockLogFlushService.flush.mockReturnValue(new Promise(() => undefined));

      void exitAfterNonRetriableCrash();
      await jest.advanceTimersByTimeAsync(1999);

      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should exit after 2 seconds when the log flush never settles', async () => {
      jest.useFakeTimers();
      mockLogFlushService.flush.mockReturnValue(new Promise(() => undefined));

      const exit = exitAfterNonRetriableCrash();
      await jest.advanceTimersByTimeAsync(2000);
      await exit;

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit when the log flush fails', async () => {
      mockLogFlushService.flush.mockRejectedValue(new Error('OCI unavailable'));

      await exitAfterNonRetriableCrash();

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit only once when a crash happens while the logs are flushing', async () => {
      jest.useFakeTimers();
      mockLogFlushService.flush.mockReturnValue(new Promise(() => undefined));

      const firstExit = exitAfterNonRetriableCrash();
      const secondExit = exitAfterNonRetriableCrash();
      await jest.advanceTimersByTimeAsync(2000);
      await Promise.all([firstExit, secondExit]);

      expect(exitSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('The message handling', () => {
    let eachBatchFunction: EachBatchHandler;
    let testBatch: Batch;

    beforeEach(async () => {
      await startService(service);
      eachBatchFunction = getEachBatch();
      testBatch = createTestBatch();
    });

    describe('when eachBatch is called with a valid message', () => {
      it('should delegate to the message handler', async () => {
        await eachBatchFunction(createEachBatchPayload(testBatch));

        expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(
          testBatch.messages[0],
          expect.any(Function)
        );
      });

      it('should commit the message offset when handler succeeds', async () => {
        const resolveOffset = jest.fn();
        const commitOffsetsIfNecessary = jest.fn().mockResolvedValue(undefined);

        await eachBatchFunction(
          createEachBatchPayload(testBatch, { resolveOffset, commitOffsetsIfNecessary })
        );

        const commitCallback = mockMessageHandler.handleMessage.mock.calls[0][1];
        await commitCallback();

        expect(resolveOffset).toHaveBeenCalledWith('100');
        expect(commitOffsetsIfNecessary).toHaveBeenCalled();
      });
    });

    describe('when eachBatch is called and message processing fails', () => {
      const runFailingBatch = async (
        resolveOffset: jest.Mock,
        heartbeat: jest.Mock
      ): Promise<void> => {
        await expect(
          eachBatchFunction(createEachBatchPayload(testBatch, { resolveOffset, heartbeat }))
        ).resolves.not.toThrow();
      };

      const verifyRetrySetup = (resolveOffset: jest.Mock, heartbeat: jest.Mock): void => {
        expect(mockRetryManager.addToRetry).toHaveBeenCalledTimes(1);
        expect(resolveOffset).toHaveBeenCalledWith('100');
        expect(heartbeat).toHaveBeenCalledTimes(1);
      };

      const verifyErrorConversion = (expectedMessage: string): void => {
        const error = mockRetryManager.addToRetry.mock.calls[0][1];
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe(expectedMessage);
      };

      beforeEach(() => {
        mockMessageHandler.handleMessage.mockRejectedValue(new Error('Processing failed'));
      });

      it('should catch the error and trigger retry mechanism', async () => {
        const resolveOffset = jest.fn();
        const heartbeat = jest.fn().mockResolvedValue(undefined);

        await runFailingBatch(resolveOffset, heartbeat);

        expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(
          testBatch.messages[0],
          expect.any(Function)
        );
        expect(mockRetryManager.addToRetry).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Error),
          expect.stringContaining('kafka-TeslaLogger_V-0-100-')
        );

        const [retryFunction, , correlationId] = mockRetryManager.addToRetry.mock.calls[0];
        expect(typeof retryFunction).toBe('function');
        expect(correlationId).toMatch(/^kafka-TeslaLogger_V-0-100-\d+$/);

        verifyRetrySetup(resolveOffset, heartbeat);
        verifyErrorConversion('Processing failed');
      });

      it('should handle string errors safely', async () => {
        mockMessageHandler.handleMessage.mockRejectedValue('String error message');
        const resolveOffset = jest.fn();
        const heartbeat = jest.fn().mockResolvedValue(undefined);

        await runFailingBatch(resolveOffset, heartbeat);

        verifyRetrySetup(resolveOffset, heartbeat);
        verifyErrorConversion('String error message');
      });

      it('should handle unknown object errors safely', async () => {
        mockMessageHandler.handleMessage.mockRejectedValue({ custom: 'error', code: 500 });
        const resolveOffset = jest.fn();
        const heartbeat = jest.fn().mockResolvedValue(undefined);

        await runFailingBatch(resolveOffset, heartbeat);

        verifyRetrySetup(resolveOffset, heartbeat);
        verifyErrorConversion('Unknown error: [object Object]');
      });

      it('should continue processing even if retry setup fails', async () => {
        mockRetryManager.addToRetry.mockImplementation(() => {
          throw new Error('Retry setup failed');
        });
        const resolveOffset = jest.fn();
        const heartbeat = jest.fn().mockResolvedValue(undefined);

        await runFailingBatch(resolveOffset, heartbeat);

        verifyRetrySetup(resolveOffset, heartbeat);
      });

      it('should continue processing even if resolveOffset fails', async () => {
        const resolveOffset = jest.fn().mockImplementation(() => {
          throw new Error('Offset commit failed');
        });
        const heartbeat = jest.fn().mockResolvedValue(undefined);

        await runFailingBatch(resolveOffset, heartbeat);

        verifyRetrySetup(resolveOffset, heartbeat);
      });

      it('should continue processing even if heartbeat fails', async () => {
        const resolveOffset = jest.fn();
        const heartbeat = jest.fn().mockRejectedValue(new Error('Heartbeat failed'));

        await runFailingBatch(resolveOffset, heartbeat);

        verifyRetrySetup(resolveOffset, heartbeat);
      });
    });
  });

  describe('The pauseConsumer method', () => {
    it('should pause the consumer for the configured topic', async () => {
      await service.pauseConsumer();

      expect(mockConsumer.pause).toHaveBeenCalledWith([{ topic: 'TeslaLogger_V' }]);
    });

    it('should be idempotent', async () => {
      await service.pauseConsumer();
      await service.pauseConsumer();

      expect(mockConsumer.pause).toHaveBeenCalledTimes(1);
    });
  });

  describe('The drainInFlight method', () => {
    it('should resolve immediately when there are no in-flight messages', async () => {
      await expect(service.drainInFlight(1000)).resolves.toBeUndefined();
    });

    it('should wait for in-flight messages to complete before resolving', async () => {
      await startService(service);
      const eachBatchFunction = getEachBatch();

      let resolveMessage: (() => void) | undefined;
      mockMessageHandler.handleMessage.mockImplementation(
        () => new Promise<void>((resolve) => {
          resolveMessage = resolve;
        })
      );

      const eachBatchPromise = eachBatchFunction(createEachBatchPayload(createTestBatch()));

      await new Promise((resolve) => setImmediate(resolve));

      const drainPromise = service.drainInFlight(5000);

      let drained = false;
      void drainPromise.then(() => {
        drained = true;
      });

      await new Promise((resolve) => setImmediate(resolve));
      expect(drained).toBe(false);

      resolveMessage?.();
      await drainPromise;
      await eachBatchPromise;

      expect(drained).toBe(true);
    });
  });
});
