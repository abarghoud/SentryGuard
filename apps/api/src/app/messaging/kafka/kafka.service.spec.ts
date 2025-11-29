import { Test, TestingModule } from '@nestjs/testing';
import { Consumer, EachMessageHandler, EachMessagePayload } from 'kafkajs';
import { KafkaService } from './kafka.service';
import { kafkaMessageHandler, MessageHandler } from './interfaces/message-handler.interface';
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
    let eachMessageFunction: EachMessageHandler;
    let consumerMock: Consumer;

    beforeEach(async () => {
      consumerMock = mock<Consumer>();
      Object.defineProperty(service, 'consumer', {
        value: consumerMock,
        writable: true,
      });

      await service.onModuleInit();

      eachMessageFunction = (consumerMock.run as jest.MockedFunction<any>).mock.calls[0][0].eachMessage;
    });

    describe('when eachMessage is called with a valid message', () => {
      let testMessage: EachMessagePayload;
      let consumerMockForTest: Consumer;

      beforeEach(() => {
        consumerMockForTest = mock<Consumer>();
        Object.defineProperty(service, 'consumer', {
          value: consumerMockForTest,
          writable: true,
        });

        testMessage = {
          topic: 'TeslaLogger_V',
          partition: 0,
          message: {
            offset: '100',
            value: Buffer.from('test message'),
            key: null,
            timestamp: '1234567890',
            attributes: 0,
            headers: {},
          },
          heartbeat: jest.fn().mockResolvedValue(undefined),
          pause: jest.fn().mockReturnValue(jest.fn()),
        };
      });

      it('should delegate to the message handler', async () => {
        await eachMessageFunction(testMessage);

        expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(
          testMessage.message,
          expect.any(Function)
        );
      });

      it('should commit the message offset when handler succeeds', async () => {
        await eachMessageFunction(testMessage);

        const commitFn = mockMessageHandler.handleMessage.mock.calls[0][1];
        await commitFn();

        expect(consumerMockForTest.commitOffsets).toHaveBeenCalledWith([{
          topic: 'TeslaLogger_V',
          partition: 0,
          offset: '101'
        }]);
      });
    });

    describe('when eachMessage is called and message processing fails', () => {
      let testMessage: EachMessagePayload;

      beforeEach(() => {
        mockMessageHandler.handleMessage.mockRejectedValue(new Error('Processing failed'));

        testMessage = {
          topic: 'TeslaLogger_V',
          partition: 0,
          message: {
            offset: '100',
            value: Buffer.from('test message'),
            key: null,
            timestamp: '1234567890',
            attributes: 0,
            headers: {},
          },
          heartbeat: jest.fn().mockResolvedValue(undefined),
          pause: jest.fn().mockReturnValue(jest.fn()),
        };
      });

      it('should catch the error and not rethrow it', async () => {
        await expect(eachMessageFunction(testMessage)).resolves.not.toThrow();

        expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(
          testMessage.message,
          expect.any(Function)
        );
      });
    });
  });
});
