import { mock } from 'jest-mock-extended';
import { OciLoggingService } from '../services/oci-logging.service';
import { OciLoggerService } from './oci-logger.service';

const mockOciLoggingService = mock<OciLoggingService>();

describe('The OciLoggerService class', () => {
  let service: OciLoggerService;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOciLoggingService.sendLog.mockResolvedValue(undefined);

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

    service = new OciLoggerService(mockOciLoggingService);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('The log() method', () => {
    describe('When message is a string', () => {
      it('should send log data and output to console', () => {
        service.log('test message');

        expect(mockOciLoggingService.sendLog).toHaveBeenCalledWith({
          timestamp: expect.any(String),
          level: 'LOG',
          context: undefined,
          message: 'test message',
          rawMessage: undefined,
          optionalParams: undefined,
        });

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('LOG'),
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('test message'),
        );
      });
    });

    describe('When message is an object', () => {
      it('should send log data with stringified message and output to console', () => {
        const message = { key: 'value', number: 123 };

        service.log(message);

        expect(mockOciLoggingService.sendLog).toHaveBeenCalledWith({
          timestamp: expect.any(String),
          level: 'LOG',
          context: undefined,
          message: JSON.stringify(message),
          rawMessage: message,
          optionalParams: undefined,
        });

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(JSON.stringify(message)),
        );
      });
    });

    describe('When context is provided', () => {
      it('should include context in log data and console output', () => {
        service.log('test message', 'MyContext');

        expect(mockOciLoggingService.sendLog).toHaveBeenCalledWith({
          timestamp: expect.any(String),
          level: 'LOG',
          context: 'MyContext',
          message: 'test message',
          rawMessage: undefined,
          optionalParams: ['MyContext'],
        });

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[MyContext]'),
        );
      });
    });

    describe('When optional params are provided', () => {
      it('should include optional params in log data', () => {
        service.log('test message', 'Context', 'param1', 'param2');

        expect(mockOciLoggingService.sendLog).toHaveBeenCalledWith({
          timestamp: expect.any(String),
          level: 'LOG',
          context: 'Context',
          message: 'test message',
          rawMessage: undefined,
          optionalParams: ['Context', 'param1', 'param2'],
        });
      });
    });

    describe('When sendLog fails', () => {
      it('should handle the error silently', async () => {
        mockOciLoggingService.sendLog.mockRejectedValue(
          new Error('Send failed'),
        );

        service.log('test message');

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(mockOciLoggingService.sendLog).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalled();
      });
    });
  });

  describe('The error() method', () => {
    describe('When message is a string', () => {
      it('should send error log data and output to console', () => {
        service.error('error message');

        expect(mockOciLoggingService.sendLog).toHaveBeenCalledWith({
          timestamp: expect.any(String),
          level: 'ERROR',
          context: undefined,
          message: 'error message',
          rawMessage: undefined,
          optionalParams: undefined,
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('ERROR'),
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('error message'),
        );
      });
    });

    describe('When message is an object', () => {
      it('should send error log data with stringified message', () => {
        const message = { error: 'Something went wrong', code: 500 };

        service.error(message);

        expect(mockOciLoggingService.sendLog).toHaveBeenCalledWith({
          timestamp: expect.any(String),
          level: 'ERROR',
          context: undefined,
          message: JSON.stringify(message),
          rawMessage: message,
          optionalParams: undefined,
        });
      });
    });

    describe('When context is provided', () => {
      it('should include context in error log data', () => {
        service.error('error message', 'ErrorContext');

        expect(mockOciLoggingService.sendLog).toHaveBeenCalledWith({
          timestamp: expect.any(String),
          level: 'ERROR',
          context: 'ErrorContext',
          message: 'error message',
          rawMessage: undefined,
          optionalParams: ['ErrorContext'],
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[ErrorContext]'),
        );
      });
    });
  });

  describe('The warn() method', () => {
    describe('When message is a string', () => {
      it('should send warning log data and output to console', () => {
        service.warn('warning message');

        expect(mockOciLoggingService.sendLog).toHaveBeenCalledWith({
          timestamp: expect.any(String),
          level: 'WARN',
          context: undefined,
          message: 'warning message',
          rawMessage: undefined,
          optionalParams: undefined,
        });

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('WARN'),
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('warning message'),
        );
      });
    });

    describe('When message is an object', () => {
      it('should send warning log data with stringified message', () => {
        const message = { warning: 'This is a warning' };

        service.warn(message);

        expect(mockOciLoggingService.sendLog).toHaveBeenCalledWith({
          timestamp: expect.any(String),
          level: 'WARN',
          context: undefined,
          message: JSON.stringify(message),
          rawMessage: message,
          optionalParams: undefined,
        });
      });
    });

    describe('When context is provided', () => {
      it('should include context in warning log data', () => {
        service.warn('warning message', 'WarnContext');

        expect(mockOciLoggingService.sendLog).toHaveBeenCalledWith({
          timestamp: expect.any(String),
          level: 'WARN',
          context: 'WarnContext',
          message: 'warning message',
          rawMessage: undefined,
          optionalParams: ['WarnContext'],
        });
      });
    });
  });

  describe('The debug() method', () => {
    describe('When message is a string', () => {
      it('should send debug log data and output to console', () => {
        service.debug('debug message');

        expect(mockOciLoggingService.sendLog).toHaveBeenCalledWith({
          timestamp: expect.any(String),
          level: 'DEBUG',
          context: undefined,
          message: 'debug message',
          rawMessage: undefined,
          optionalParams: undefined,
        });

        expect(consoleDebugSpy).toHaveBeenCalledWith(
          expect.stringContaining('DEBUG'),
        );
        expect(consoleDebugSpy).toHaveBeenCalledWith(
          expect.stringContaining('debug message'),
        );
      });
    });

    describe('When message is an object', () => {
      it('should send debug log data with stringified message', () => {
        const message = { debug: 'Debug information', data: { key: 'value' } };

        service.debug(message);

        expect(mockOciLoggingService.sendLog).toHaveBeenCalledWith({
          timestamp: expect.any(String),
          level: 'DEBUG',
          context: undefined,
          message: JSON.stringify(message),
          rawMessage: message,
          optionalParams: undefined,
        });
      });
    });

    describe('When context is provided', () => {
      it('should include context in debug log data', () => {
        service.debug('debug message', 'DebugContext');

        expect(mockOciLoggingService.sendLog).toHaveBeenCalledWith({
          timestamp: expect.any(String),
          level: 'DEBUG',
          context: 'DebugContext',
          message: 'debug message',
          rawMessage: undefined,
          optionalParams: ['DebugContext'],
        });
      });
    });
  });

  describe('The verbose() method', () => {
    describe('When message is a string', () => {
      it('should send verbose log data and output to console', () => {
        service.verbose('verbose message');

        expect(mockOciLoggingService.sendLog).toHaveBeenCalledWith({
          timestamp: expect.any(String),
          level: 'VERBOSE',
          context: undefined,
          message: 'verbose message',
          rawMessage: undefined,
          optionalParams: undefined,
        });

        expect(consoleDebugSpy).toHaveBeenCalledWith(
          expect.stringContaining('VERBOSE'),
        );
        expect(consoleDebugSpy).toHaveBeenCalledWith(
          expect.stringContaining('verbose message'),
        );
      });
    });

    describe('When message is an object', () => {
      it('should send verbose log data with stringified message', () => {
        const message = { verbose: 'Verbose information' };

        service.verbose(message);

        expect(mockOciLoggingService.sendLog).toHaveBeenCalledWith({
          timestamp: expect.any(String),
          level: 'VERBOSE',
          context: undefined,
          message: JSON.stringify(message),
          rawMessage: message,
          optionalParams: undefined,
        });
      });
    });

    describe('When context is provided', () => {
      it('should include context in verbose log data', () => {
        service.verbose('verbose message', 'VerboseContext');

        expect(mockOciLoggingService.sendLog).toHaveBeenCalledWith({
          timestamp: expect.any(String),
          level: 'VERBOSE',
          context: 'VerboseContext',
          message: 'verbose message',
          rawMessage: undefined,
          optionalParams: ['VerboseContext'],
        });
      });
    });
  });
});

