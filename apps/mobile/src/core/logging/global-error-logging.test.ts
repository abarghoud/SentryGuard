import { mock, MockProxy } from 'jest-mock-extended';

import { AppLoggerRequirements } from './app-logging.requirements';
import { installGlobalErrorLogging } from './global-error-logging';

interface GlobalWithErrorUtils {
  ErrorUtils?: {
    getGlobalHandler(): (error: unknown, isFatal?: boolean) => void;
    setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
  };
}

describe('The installGlobalErrorLogging() function', () => {
  const globalWithErrorUtils = globalThis as GlobalWithErrorUtils;
  let logger: MockProxy<AppLoggerRequirements>;
  let previousHandler: jest.Mock;
  let installedHandler: (error: unknown, isFatal?: boolean) => void;

  beforeEach(() => {
    logger = mock<AppLoggerRequirements>();
    previousHandler = jest.fn();
    globalWithErrorUtils.ErrorUtils = {
      getGlobalHandler: () => previousHandler,
      setGlobalHandler: (handler) => {
        installedHandler = handler;
      },
    };
    installGlobalErrorLogging(logger);
  });

  afterEach(() => {
    delete globalWithErrorUtils.ErrorUtils;
  });

  describe('When a fatal error reaches the global handler', () => {
    beforeEach(() => {
      installedHandler(new Error('Boom'), true);
    });

    it('should log the error as fatal', () => {
      expect(logger.error).toHaveBeenCalledWith('crash', 'Fatal JS error', expect.stringContaining('Error: Boom'));
    });

    it('should forward the error to the previous handler', () => {
      expect(previousHandler).toHaveBeenCalledWith(expect.any(Error), true);
    });
  });

  describe('When a non-fatal error reaches the global handler', () => {
    beforeEach(() => {
      installedHandler('plain failure', false);
    });

    it('should log the error as non-fatal', () => {
      expect(logger.error).toHaveBeenCalledWith('crash', 'Unhandled JS error', 'plain failure');
    });
  });

  describe('When the runtime has no ErrorUtils', () => {
    it('should not throw', () => {
      delete globalWithErrorUtils.ErrorUtils;

      expect(() => installGlobalErrorLogging(logger)).not.toThrow();
    });
  });
});
