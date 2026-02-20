import { mock, MockProxy } from 'jest-mock-extended';
import { PinoLogger } from 'nestjs-pino';
import { storage, Store } from 'nestjs-pino/storage';
import { KafkaLogContextService } from './kafka-log-context.service';

const mockChildLogger = { child: jest.fn() };
const mockRootChild = jest.fn().mockReturnValue(mockChildLogger);

Object.defineProperty(PinoLogger, 'root', {
  value: { child: mockRootChild },
  writable: true,
  configurable: true,
});

describe('The KafkaLogContextService class', () => {
  let service: KafkaLogContextService;
  let mockPinoLogger: MockProxy<PinoLogger>;

  beforeEach(() => {
    mockPinoLogger = mock<PinoLogger>();
    service = new KafkaLogContextService(mockPinoLogger);
    jest.clearAllMocks();
    mockRootChild.mockReturnValue(mockChildLogger);
  });

  describe('The runWithContext() method', () => {
    const fakeVin = '5YJ3E1EA1NF123456';
    const fakeCorrelationId = 'offset-42-5YJ3E1EA-abc123';

    describe('When called with vin and correlationId', () => {
      let result: string;
      let capturedStore: Store | undefined;

      beforeEach(async () => {
        jest.spyOn(storage, 'run').mockImplementation(
          (_store: Store, callback: () => Promise<string>) => {
            capturedStore = _store;
            return callback();
          }
        );

        result = await service.runWithContext(
          { vin: fakeVin, correlationId: fakeCorrelationId },
          async () => 'callback-result'
        );
      });

      it('should create a child logger with vin and correlationId', () => {
        expect(mockRootChild).toHaveBeenCalledWith({
          vin: fakeVin,
          correlationId: fakeCorrelationId,
        });
      });

      it('should run the callback within an AsyncLocalStorage context', () => {
        expect(storage.run).toHaveBeenCalledWith(
          expect.any(Store),
          expect.any(Function)
        );
      });

      it('should create a Store with the child logger', () => {
        expect(capturedStore).toBeInstanceOf(Store);
        expect(capturedStore?.logger).toBe(mockChildLogger);
      });

      it('should return the callback result', () => {
        expect(result).toBe('callback-result');
      });
    });

    describe('When the callback throws an error', () => {
      const expectedError = 'Processing failed';

      beforeEach(() => {
        jest.spyOn(storage, 'run').mockImplementation(
          (_store: Store, callback: () => Promise<never>) => callback()
        );
      });

      it('should propagate the error', async () => {
        await expect(
          service.runWithContext(
            { vin: fakeVin, correlationId: fakeCorrelationId },
            async () => { throw new Error(expectedError); }
          )
        ).rejects.toThrow(expectedError);
      });
    });
  });

  describe('The assignUserId() method', () => {
    const fakeUserId = 'usr-123';

    describe('When called with a userId', () => {
      beforeEach(() => {
        service.assignUserId(fakeUserId);
      });

      it('should delegate to PinoLogger.assign with userId field', () => {
        expect(mockPinoLogger.assign).toHaveBeenCalledWith({
          userId: fakeUserId,
        });
      });
    });
  });
});
