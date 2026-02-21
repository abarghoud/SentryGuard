import { mock, MockProxy } from 'jest-mock-extended';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { of } from 'rxjs';
import { LogContextInterceptor } from './log-context.interceptor';

describe('The LogContextInterceptor class', () => {
  let interceptor: LogContextInterceptor;
  let mockPinoLogger: MockProxy<PinoLogger>;
  let mockCallHandler: MockProxy<CallHandler>;

  beforeEach(() => {
    mockPinoLogger = mock<PinoLogger>();
    mockCallHandler = mock<CallHandler>();
    mockCallHandler.handle.mockReturnValue(of('response'));
    interceptor = new LogContextInterceptor(mockPinoLogger);
  });

  const createMockExecutionContext = (request: Record<string, unknown>): MockProxy<ExecutionContext> => {
    const mockContext = mock<ExecutionContext>();
    mockContext.switchToHttp.mockReturnValue({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => jest.fn(),
    });
    return mockContext;
  };

  describe('The intercept() method', () => {
    describe('When request has userId and vin', () => {
      beforeEach(() => {
        const context = createMockExecutionContext({
          user: { userId: 'usr-123' },
          params: { vin: '5YJ3E1EA1NF123456' },
        });

        interceptor.intercept(context, mockCallHandler);
      });

      it('should assign userId and vin to pino logger', () => {
        expect(mockPinoLogger.assign).toHaveBeenCalledWith({
          userId: 'usr-123',
          vin: '5YJ3E1EA1NF123456',
        });
      });

      it('should call next handler', () => {
        expect(mockCallHandler.handle).toHaveBeenCalled();
      });
    });

    describe('When request has only userId', () => {
      beforeEach(() => {
        const context = createMockExecutionContext({
          user: { userId: 'usr-123' },
          params: {},
        });

        interceptor.intercept(context, mockCallHandler);
      });

      it('should assign only userId', () => {
        expect(mockPinoLogger.assign).toHaveBeenCalledWith({
          userId: 'usr-123',
        });
      });
    });

    describe('When request has only vin', () => {
      beforeEach(() => {
        const context = createMockExecutionContext({
          params: { vin: '5YJ3E1EA1NF123456' },
        });

        interceptor.intercept(context, mockCallHandler);
      });

      it('should assign only vin', () => {
        expect(mockPinoLogger.assign).toHaveBeenCalledWith({
          vin: '5YJ3E1EA1NF123456',
        });
      });
    });

    describe('When request has neither userId nor vin', () => {
      beforeEach(() => {
        const context = createMockExecutionContext({
          params: {},
        });

        interceptor.intercept(context, mockCallHandler);
      });

      it('should not call assign', () => {
        expect(mockPinoLogger.assign).not.toHaveBeenCalled();
      });

      it('should still call next handler', () => {
        expect(mockCallHandler.handle).toHaveBeenCalled();
      });
    });
  });
});
