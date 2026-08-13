jest.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 34 },
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
}));

import { mock, MockProxy } from 'jest-mock-extended';

import { AppLogger } from './app-logger';
import { AppLogEntry, AppLogLevel, AppLogStorageRequirements } from './app-logging.requirements';

describe('The AppLogger class', () => {
  let storage: MockProxy<AppLogStorageRequirements>;
  let logger: AppLogger;

  beforeEach(() => {
    jest.useFakeTimers();
    storage = mock<AppLogStorageRequirements>();
    storage.load.mockResolvedValue([]);
    storage.save.mockResolvedValue();
    logger = new AppLogger(storage);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('The exportLogs() method', () => {
    describe('When an info entry was logged', () => {
      let exported: string;

      beforeEach(async () => {
        logger.info('push', 'Push token synced');
        exported = await logger.exportLogs();
      });

      it('should include the formatted entry', () => {
        expect(exported).toContain('[INFO] push: Push token synced');
      });

      it('should include the app version header', () => {
        expect(exported).toContain('App version: 1.0.0');
      });

      it('should include the platform header', () => {
        expect(exported).toContain('Platform: android 34');
      });
    });

    describe('When an entry carries structured data', () => {
      let exported: string;

      beforeEach(async () => {
        logger.error('api', 'Request failed', { status: 500 });
        exported = await logger.exportLogs();
      });

      it('should serialize the data after the message', () => {
        expect(exported).toContain('[ERROR] api: Request failed | {"status":500}');
      });
    });

    describe('When the data exceeds the length limit', () => {
      let exported: string;

      beforeEach(async () => {
        logger.warn('api', 'Long payload', 'x'.repeat(500));
        exported = await logger.exportLogs();
      });

      it('should truncate the serialized data', () => {
        expect(exported).not.toContain('x'.repeat(301));
      });
    });

    describe('When more entries than the buffer limit were logged', () => {
      let exported: string;

      beforeEach(async () => {
        for (let index = 0; index < 5020; index += 1) {
          logger.info('app', `Entry ${index}`);
        }
        exported = await logger.exportLogs();
      });

      it('should keep only the most recent entries', () => {
        expect(exported).not.toContain('Entry 19\n');
      });

      it('should report the buffer limit in the header', () => {
        expect(exported).toContain('Entries: 5000');
      });
    });

    describe('When the same message is logged consecutively', () => {
      let exported: string;

      beforeEach(async () => {
        logger.info('api', 'GET /alerts → 200', '60ms');
        logger.info('api', 'GET /alerts → 200', '154ms');
        logger.info('api', 'GET /alerts → 200', '91ms');
        exported = await logger.exportLogs();
      });

      it('should collapse the repeats into a single entry', () => {
        expect(exported).toContain('Entries: 1');
      });

      it('should report the repeat count with the latest data', () => {
        expect(exported).toContain('GET /alerts → 200 | 91ms (×3)');
      });
    });

    describe('When the same message is logged non-consecutively', () => {
      let exported: string;

      beforeEach(async () => {
        logger.info('api', 'GET /alerts → 200', '60ms');
        logger.info('nav', 'Screen → Settings');
        logger.info('api', 'GET /alerts → 200', '91ms');
        exported = await logger.exportLogs();
      });

      it('should keep the entries separate', () => {
        expect(exported).toContain('Entries: 3');
      });
    });
  });

  describe('The initialize() method', () => {
    describe('When entries were persisted by a previous session', () => {
      const persistedEntry: AppLogEntry = {
        level: AppLogLevel.Info,
        message: 'Previous session entry',
        tag: 'app',
        timestamp: '2026-01-01T00:00:00.000Z',
      };
      let exported: string;

      beforeEach(async () => {
        storage.load.mockResolvedValue([persistedEntry]);
        await logger.initialize();
        exported = await logger.exportLogs();
      });

      it('should keep the persisted entries', () => {
        expect(exported).toContain('Previous session entry');
      });

      it('should log the session start', () => {
        expect(exported).toContain('Session started (v1.0.0, android 34)');
      });
    });
  });

  describe('The clear() method', () => {
    describe('When entries were logged before clearing', () => {
      beforeEach(async () => {
        logger.info('app', 'Entry to clear');
        await logger.clear();
      });

      it('should persist an empty log list', () => {
        expect(storage.save).toHaveBeenCalledWith([]);
      });

      it('should export without the cleared entry', async () => {
        await expect(logger.exportLogs()).resolves.not.toContain('Entry to clear');
      });
    });
  });

  describe('The info() method', () => {
    describe('When the flush delay elapses', () => {
      beforeEach(() => {
        logger.info('app', 'Buffered entry');
        jest.advanceTimersByTime(1000);
      });

      it('should persist the buffered entries', () => {
        expect(storage.save).toHaveBeenCalledWith([expect.objectContaining({ message: 'Buffered entry' })]);
      });
    });

    describe('When the flush delay has not elapsed', () => {
      beforeEach(() => {
        logger.info('app', 'Buffered entry');
      });

      it('should not persist yet', () => {
        expect(storage.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('The error() method', () => {
    describe('When an error entry is logged', () => {
      beforeEach(() => {
        logger.error('crash', 'Fatal JS error');
      });

      it('should persist immediately without waiting for the flush delay', () => {
        expect(storage.save).toHaveBeenCalledWith([expect.objectContaining({ message: 'Fatal JS error' })]);
      });
    });
  });
});
