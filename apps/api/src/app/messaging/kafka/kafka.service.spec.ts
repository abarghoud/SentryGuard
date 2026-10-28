import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Consumer, EachBatchHandler, Batch, Kafka } from 'kafkajs';
import { KafkaService } from './kafka.service';
import { kafkaMessageHandler, MessageHandler } from './interfaces/message-handler.interface';
import { RetryManager } from '../../shared/retry-manager.service';
import { mock } from 'jest-mock-extended';

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      commitOffsets: jest.fn().mockResolvedValue(undefined),
      events: {
        CRASH: 'consumer.crash',
        DISCONNECT: 'consumer.disconnect',
        GROUP_JOIN: 'consumer.group_join',
        HEARTBEAT: 'consumer.heartbeat',
        FETCH_START: 'consumer.fetch_start',
      },
      on: jest.fn(),
    }),
  })),
}));

const mockMessageHandler = mock<MessageHandler>();
const mockRetryManager = mock<RetryManager>();

const getLastConsumerMock = (): Consumer & { on: jest.Mock; disconnect: jest.Mock } => {
  const kafkaMock = Kafka as unknown as jest.Mock;
  const kafkaInstance = kafkaMock.mock.results[kafkaMock.mock.results.length - 1]
    .value as { consumer: jest.Mock };
  return kafkaInstance.consumer.mock.results[kafkaInstance.consumer.mock.results.length - 1]
    .value as Consumer & { on: jest.Mock; disconnect: jest.Mock };
};

const getRegisteredListener = (eventName: string): ((event?: unknown) => unknown) => {
  const consumerMock = getLastConsumerMock();
  const call = consumerMock.on.mock.calls.find((callArgs) => callArgs[0] === eventName);
  if (!call) {
    throw new Error(`No listener registered for event ${eventName}`);
  }
  return call[1] as (event?: unknown) => unknown;
};

const setPrivate = (target: object, key: string, value: unknown): void => {
  Object.defineProperty(target, key, { value, writable: true });
};

const getLogger = (target: KafkaService): Logger =>
  (target as unknown as { logger: Logger }).logger;

describe('The KafkaService class', () => {
  let service: KafkaService;

  beforeEach(async () => {
    mockMessageHandler.handleMessage.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaService,
        {
          provide: kafkaMessageHandler,
          useValue: mockMessageHandler,
        },
        {
          provide: RetryManager,
          useValue: mockRetryManager,
        },
      ],
    }).compile();

    service = module.get<KafkaService>(KafkaService);

    jest.clearAllMocks();
    mockMessageHandler.handleMessage.mockResolvedValue(undefined);

    process.env.KAFKA_BROKERS = '10.0.2.15:9092';
    process.env.KAFKA_CLIENT_ID = 'tesla-guard-api';
    process.env.KAFKA_GROUP_ID = 'tesla-guard-consumer-group';
    process.env.KAFKA_TOPIC = 'TeslaLogger_V';
  });

  afterEach(() => {
    delete process.env.KAFKA_BROKERS;
    delete process.env.KAFKA_CLIENT_ID;
    delete process.env.KAFKA_GROUP_ID;
    delete process.env.KAFKA_TOPIC;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('The onModuleInit method', () => {
    it('should start listening when module initializes', async () => {
      const consumerMock = mock<Consumer>();

      Object.defineProperty(service, 'consumer', {
        value: consumerMock,
        writable: true,
      });

      await service.onModuleInit();

      expect(consumerMock.connect).toHaveBeenCalled();
      expect(consumerMock.subscribe).toHaveBeenCalledWith({
        topic: 'TeslaLogger_V',
        fromBeginning: false,
      });
      expect(consumerMock.run).toHaveBeenCalled();
    });
  });

  describe('The onModuleDestroy method', () => {
    it('should stop listening when module destroys', async () => {
      const consumerMock = mock<Consumer>();

      Object.defineProperty(service, 'consumer', {
        value: consumerMock,
        writable: true,
      });

      await service.onModuleDestroy();

      expect(consumerMock.disconnect).toHaveBeenCalled();
    });
  });

  describe('The healthCheck method', () => {
    let consumerMock: ReturnType<typeof mock<Consumer>>;
    let exitSpy: jest.SpyInstance;

    const runHealthChecks = async (target: KafkaService, count: number): Promise<void> => {
      for (let i = 0; i < count; i++) {
        await target.healthCheck();
      }
    };

    const prepare = (target: KafkaService): void => {
      setPrivate(target, 'consumer', consumerMock);
      setPrivate(target, 'isConnected', true);
      setPrivate(target, 'lastActivityAt', Date.now());
    };

    beforeEach(() => {
      jest.useFakeTimers();
      consumerMock = mock<Consumer>();
      consumerMock.describeGroup.mockResolvedValue(
        {} as Awaited<ReturnType<Consumer['describeGroup']>>
      );
      exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
      prepare(service);
    });

    afterEach(() => {
      jest.useRealTimers();
      exitSpy.mockRestore();
      delete process.env.KAFKA_HEALTH_CHECK_MAX_FAILURES;
      delete process.env.KAFKA_HEALTH_CHECK_TIMEOUT_MS;
      delete process.env.KAFKA_LIVENESS_MAX_IDLE_MS;
    });

    it('should describe the group when the consumer is connected and active', async () => {
      await service.healthCheck();

      expect(consumerMock.describeGroup).toHaveBeenCalledTimes(1);
      expect(exitSpy).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should never disconnect, reconnect or restart the consumer when checks fail', async () => {
      consumerMock.describeGroup.mockRejectedValue(new Error('Closed connection'));

      await runHealthChecks(service, 4);

      expect(consumerMock.disconnect).not.toHaveBeenCalled();
      expect(consumerMock.connect).not.toHaveBeenCalled();
      expect(consumerMock.subscribe).not.toHaveBeenCalled();
      expect(consumerMock.run).not.toHaveBeenCalled();
    });

    it('should not exit before the maximum number of consecutive failures', async () => {
      consumerMock.describeGroup.mockRejectedValue(new Error('Closed connection'));
      const warnSpy = jest.spyOn(getLogger(service), 'warn');

      await runHealthChecks(service, 3);

      expect(exitSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenLastCalledWith(
        '[KAFKA_HEALTH] failure 3/4: describeGroup failed: Closed connection'
      );
    });

    it('should exit with code 1 after the maximum number of consecutive failures', async () => {
      consumerMock.describeGroup.mockRejectedValue(new Error('Closed connection'));
      const fatalSpy = jest.spyOn(getLogger(service), 'fatal');

      await runHealthChecks(service, 4);

      expect(exitSpy).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(fatalSpy).toHaveBeenCalledWith(
        '[KAFKA_HEALTH_FATAL] describeGroup failed: Closed connection, exiting for container restart'
      );
    });

    it('should reset the failure count after a successful check', async () => {
      const logSpy = jest.spyOn(getLogger(service), 'log');
      consumerMock.describeGroup
        .mockRejectedValueOnce(new Error('Closed connection'))
        .mockRejectedValueOnce(new Error('Closed connection'));

      await runHealthChecks(service, 3);

      expect(logSpy).toHaveBeenCalledWith('[KAFKA_HEALTH] recovered after 2 failure(s)');

      consumerMock.describeGroup.mockRejectedValue(new Error('Closed connection'));
      await runHealthChecks(service, 3);

      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should count a describeGroup call that never settles as a failure', async () => {
      consumerMock.describeGroup.mockReturnValue(new Promise(() => undefined));
      const warnSpy = jest.spyOn(getLogger(service), 'warn');

      for (let i = 0; i < 4; i++) {
        const check = service.healthCheck();
        await jest.advanceTimersByTimeAsync(10000);
        await check;
      }

      expect(warnSpy).toHaveBeenCalledWith(
        '[KAFKA_HEALTH] failure 1/4: describeGroup failed: timed out after 10000ms'
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should count a disconnected consumer as a failure without trying to reconnect', async () => {
      setPrivate(service, 'isConnected', false);

      await runHealthChecks(service, 4);

      expect(consumerMock.describeGroup).not.toHaveBeenCalled();
      expect(consumerMock.connect).not.toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should count a consumer without recent heartbeat or fetch as a failure', async () => {
      setPrivate(service, 'lastActivityAt', Date.now() - 120001);
      const warnSpy = jest.spyOn(getLogger(service), 'warn');

      await service.healthCheck();

      expect(consumerMock.describeGroup).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        '[KAFKA_HEALTH] failure 1/4: no heartbeat or fetch for 120001ms'
      );
    });

    it('should run only one check at a time', async () => {
      consumerMock.describeGroup.mockReturnValue(new Promise(() => undefined));

      const firstCheck = service.healthCheck();
      await service.healthCheck();

      expect(consumerMock.describeGroup).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(10000);
      await firstCheck;
    });

    it('should skip the check during graceful shutdown', async () => {
      setPrivate(service, 'isShuttingDown', true);
      setPrivate(service, 'isConnected', false);

      await runHealthChecks(service, 4);

      expect(consumerMock.describeGroup).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should read the thresholds from the environment', async () => {
      process.env.KAFKA_HEALTH_CHECK_MAX_FAILURES = '2';
      process.env.KAFKA_HEALTH_CHECK_TIMEOUT_MS = '500';
      const configuredService = new KafkaService(mockMessageHandler, mockRetryManager);
      prepare(configuredService);
      consumerMock.describeGroup.mockReturnValue(new Promise(() => undefined));

      for (let i = 0; i < 2; i++) {
        const check = configuredService.healthCheck();
        await jest.advanceTimersByTimeAsync(500);
        await check;
      }

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should fall back to the default thresholds when the environment is invalid', async () => {
      process.env.KAFKA_HEALTH_CHECK_MAX_FAILURES = 'abc';
      process.env.KAFKA_LIVENESS_MAX_IDLE_MS = '-5';
      const configuredService = new KafkaService(mockMessageHandler, mockRetryManager);
      prepare(configuredService);
      setPrivate(configuredService, 'lastActivityAt', Date.now() - 60000);
      consumerMock.describeGroup.mockRejectedValue(new Error('Closed connection'));

      await runHealthChecks(configuredService, 3);

      expect(consumerMock.describeGroup).toHaveBeenCalledTimes(3);
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe('The KafkaJS event listeners', () => {
    let exitSpy: jest.SpyInstance;

    beforeEach(() => {
      exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    });

    afterEach(() => {
      exitSpy.mockRestore();
    });

    it('should let KafkaJS restart itself after a retriable crash', async () => {
      new KafkaService(mockMessageHandler, mockRetryManager);
      const consumerMock = getLastConsumerMock();
      const crashListener = getRegisteredListener('consumer.crash');

      await crashListener({ payload: { error: new Error('Connection timeout'), restart: true } });

      expect(consumerMock.disconnect).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should exit with code 1 when KafkaJS gives up after a non-retriable crash', async () => {
      const freshService = new KafkaService(mockMessageHandler, mockRetryManager);
      const consumerMock = getLastConsumerMock();
      const crashListener = getRegisteredListener('consumer.crash');
      const fatalSpy = jest.spyOn(getLogger(freshService), 'fatal');

      await crashListener({ payload: { error: new Error('Invalid credentials'), restart: false } });

      expect(consumerMock.disconnect).not.toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(fatalSpy).toHaveBeenCalledWith(
        '[KAFKA_CRASH_FATAL] non-retriable crash, exiting',
        'Invalid credentials'
      );
    });

    it('should restore the connected state when the consumer rejoins the group', async () => {
      const freshService = new KafkaService(mockMessageHandler, mockRetryManager);
      const groupJoinListener = getRegisteredListener('consumer.group_join');

      const consumerMock = mock<Consumer>();
      consumerMock.describeGroup.mockResolvedValue(
        {} as Awaited<ReturnType<Consumer['describeGroup']>>
      );

      setPrivate(freshService, 'consumer', consumerMock);
      setPrivate(freshService, 'isConnected', false);

      groupJoinListener();

      await freshService.healthCheck();

      expect(consumerMock.describeGroup).toHaveBeenCalled();
      expect(consumerMock.disconnect).not.toHaveBeenCalled();
    });

    it.each(['consumer.heartbeat', 'consumer.fetch_start'])(
      'should consider the consumer active again on %s',
      async (eventName) => {
        const freshService = new KafkaService(mockMessageHandler, mockRetryManager);
        const activityListener = getRegisteredListener(eventName);

        const consumerMock = mock<Consumer>();
        consumerMock.describeGroup.mockResolvedValue(
          {} as Awaited<ReturnType<Consumer['describeGroup']>>
        );

        setPrivate(freshService, 'consumer', consumerMock);
        setPrivate(freshService, 'isConnected', true);
        setPrivate(freshService, 'lastActivityAt', Date.now() - 600000);

        activityListener();

        await freshService.healthCheck();

        expect(consumerMock.describeGroup).toHaveBeenCalled();
      }
    );
  });

  describe('The message handling', () => {
    let eachBatchFunction: EachBatchHandler;
    let consumerMock: Consumer;

    beforeEach(async () => {
      consumerMock = mock<Consumer>();
      Object.defineProperty(service, 'consumer', {
        value: consumerMock,
        writable: true,
      });

      await service.onModuleInit();

      eachBatchFunction = (consumerMock.run as jest.MockedFunction<any>).mock.calls[0][0].eachBatch;
    });

    describe('when eachBatch is called with a valid message', () => {
      let testBatch: Batch;
      let consumerMockForTest: Consumer;

      beforeEach(() => {
        consumerMockForTest = mock<Consumer>();
        Object.defineProperty(service, 'consumer', {
          value: consumerMockForTest,
          writable: true,
        });

        testBatch = {
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
        };
      });

      it('should delegate to the message handler', async () => {
        const resolveOffset = jest.fn();
        const heartbeat = jest.fn().mockResolvedValue(undefined);
        const commitOffsetsIfNecessary = jest.fn().mockResolvedValue(undefined);
        const pause = jest.fn().mockReturnValue(jest.fn());

        await eachBatchFunction({
          batch: testBatch,
          resolveOffset,
          heartbeat,
          commitOffsetsIfNecessary,
          pause,
          isRunning: jest.fn().mockReturnValue(true),
          isStale: jest.fn().mockReturnValue(false),
          uncommittedOffsets: jest.fn().mockReturnValue({}),
        });

        expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(
          testBatch.messages[0],
          expect.any(Function)
        );
      });

      it('should commit the message offset when handler succeeds', async () => {
        const resolveOffset = jest.fn();
        const heartbeat = jest.fn().mockResolvedValue(undefined);
        const commitOffsetsIfNecessary = jest.fn().mockResolvedValue(undefined);
        const pause = jest.fn().mockReturnValue(jest.fn());

        await eachBatchFunction({
          batch: testBatch,
          resolveOffset,
          heartbeat,
          commitOffsetsIfNecessary,
          pause,
          isRunning: jest.fn().mockReturnValue(true),
          isStale: jest.fn().mockReturnValue(false),
          uncommittedOffsets: jest.fn().mockReturnValue({}),
        });

        const commitCallback = mockMessageHandler.handleMessage.mock.calls[0][1];
        await commitCallback();

        expect(resolveOffset).toHaveBeenCalledWith('100');
        expect(commitOffsetsIfNecessary).toHaveBeenCalled();
      });
    });

    describe('when eachBatch is called and message processing fails', () => {
      let testBatch: Batch;

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
        resolveOffset = jest.fn(),
        heartbeat = jest.fn().mockResolvedValue(undefined),
        commitOffsetsIfNecessary = jest.fn().mockResolvedValue(undefined),
        pause = jest.fn().mockReturnValue(jest.fn())
      ) => ({
        batch: testBatch,
        resolveOffset,
        heartbeat,
        commitOffsetsIfNecessary,
        pause,
        isRunning: jest.fn().mockReturnValue(true),
        isStale: jest.fn().mockReturnValue(false),
        uncommittedOffsets: jest.fn().mockReturnValue({}),
      });

      const verifyRetrySetup = (resolveOffset: jest.Mock, heartbeat: jest.Mock) => {
        expect(mockRetryManager.addToRetry).toHaveBeenCalledTimes(1);
        expect(resolveOffset).toHaveBeenCalledWith('100');
        expect(heartbeat).toHaveBeenCalledTimes(1);
      };

      const verifyErrorConversion = (expectedMessage: string) => {
        const addToRetryCall = mockRetryManager.addToRetry.mock.calls[0];
        const error = addToRetryCall[1];
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe(expectedMessage);
      };

      beforeEach(() => {
        mockMessageHandler.handleMessage.mockRejectedValue(new Error('Processing failed'));
        testBatch = createTestBatch();
      });

      it('should catch the error and trigger retry mechanism', async () => {
        const resolveOffset = jest.fn();
        const heartbeat = jest.fn().mockResolvedValue(undefined);

        await expect(eachBatchFunction(createEachBatchPayload(resolveOffset, heartbeat))).resolves.not.toThrow();

        expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(
          testBatch.messages[0],
          expect.any(Function)
        );

        expect(mockRetryManager.addToRetry).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Error),
          expect.stringContaining('kafka-TeslaLogger_V-0-100-')
        );

        const addToRetryCall = mockRetryManager.addToRetry.mock.calls[0];
        const retryFunction = addToRetryCall[0];
        const correlationId = addToRetryCall[2];

        expect(typeof retryFunction).toBe('function');
        expect(correlationId).toMatch(/^kafka-TeslaLogger_V-0-100-\d+$/);

        verifyRetrySetup(resolveOffset, heartbeat);
        verifyErrorConversion('Processing failed');
      });

      it('should handle string errors safely', async () => {
        mockMessageHandler.handleMessage.mockRejectedValue('String error message');

        const resolveOffset = jest.fn();
        const heartbeat = jest.fn().mockResolvedValue(undefined);

        await expect(eachBatchFunction(createEachBatchPayload(resolveOffset, heartbeat))).resolves.not.toThrow();

        verifyRetrySetup(resolveOffset, heartbeat);
        verifyErrorConversion('String error message');
      });

      it('should handle unknown object errors safely', async () => {
        mockMessageHandler.handleMessage.mockRejectedValue({ custom: 'error', code: 500 });

        const resolveOffset = jest.fn();
        const heartbeat = jest.fn().mockResolvedValue(undefined);

        await expect(eachBatchFunction(createEachBatchPayload(resolveOffset, heartbeat))).resolves.not.toThrow();

        verifyRetrySetup(resolveOffset, heartbeat);
        verifyErrorConversion('Unknown error: [object Object]');
      });

      it('should continue processing even if retry setup fails', async () => {
        mockRetryManager.addToRetry.mockImplementation(() => {
          throw new Error('Retry setup failed');
        });

        const resolveOffset = jest.fn();
        const heartbeat = jest.fn().mockResolvedValue(undefined);

        await expect(eachBatchFunction(createEachBatchPayload(resolveOffset, heartbeat))).resolves.not.toThrow();

        verifyRetrySetup(resolveOffset, heartbeat);
      });

      it('should continue processing even if resolveOffset fails', async () => {
        const resolveOffset = jest.fn().mockImplementation(() => {
          throw new Error('Offset commit failed');
        });
        const heartbeat = jest.fn().mockResolvedValue(undefined);

        await expect(eachBatchFunction(createEachBatchPayload(resolveOffset, heartbeat))).resolves.not.toThrow();

        verifyRetrySetup(resolveOffset, heartbeat);
      });

      it('should continue processing even if heartbeat fails', async () => {
        const resolveOffset = jest.fn();
        const heartbeat = jest.fn().mockRejectedValue(new Error('Heartbeat failed'));

        await expect(eachBatchFunction(createEachBatchPayload(resolveOffset, heartbeat))).resolves.not.toThrow();

        verifyRetrySetup(resolveOffset, heartbeat);
      });
    });
  });

  describe('The pauseConsumer method', () => {
    it('should pause the consumer for the configured topic', async () => {
      const consumerMock = mock<Consumer>();

      Object.defineProperty(service, 'consumer', {
        value: consumerMock,
        writable: true,
      });

      await service.pauseConsumer();

      expect(consumerMock.pause).toHaveBeenCalledWith([{ topic: 'TeslaLogger_V' }]);
    });

    it('should be idempotent', async () => {
      const consumerMock = mock<Consumer>();

      Object.defineProperty(service, 'consumer', {
        value: consumerMock,
        writable: true,
      });

      await service.pauseConsumer();
      await service.pauseConsumer();

      expect(consumerMock.pause).toHaveBeenCalledTimes(1);
    });
  });

  describe('The drainInFlight method', () => {
    it('should resolve immediately when there are no in-flight messages', async () => {
      await expect(service.drainInFlight(1000)).resolves.toBeUndefined();
    });

    it('should wait for in-flight messages to complete before resolving', async () => {
      const consumerMock = mock<Consumer>();

      Object.defineProperty(service, 'consumer', {
        value: consumerMock,
        writable: true,
      });

      await service.onModuleInit();
      const eachBatchFunction = (consumerMock.run as jest.MockedFunction<any>).mock.calls[0][0].eachBatch;

      let resolveMessage: (() => void) | undefined;
      mockMessageHandler.handleMessage.mockImplementation(
        () => new Promise<void>((resolve) => {
          resolveMessage = resolve;
        })
      );

      const testBatch = {
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
      } as unknown as Batch;

      const eachBatchPromise = eachBatchFunction({
        batch: testBatch,
        resolveOffset: jest.fn(),
        heartbeat: jest.fn().mockResolvedValue(undefined),
        commitOffsetsIfNecessary: jest.fn().mockResolvedValue(undefined),
        pause: jest.fn().mockReturnValue(jest.fn()),
        isRunning: jest.fn().mockReturnValue(true),
        isStale: jest.fn().mockReturnValue(false),
        uncommittedOffsets: jest.fn().mockReturnValue({}),
      });

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
