import { Test, TestingModule } from '@nestjs/testing';
import { Consumer, EachBatchHandler, Batch } from 'kafkajs';
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
    }),
  })),
}));

const mockMessageHandler = mock<MessageHandler>();
const mockRetryManager = mock<RetryManager>();

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
});
