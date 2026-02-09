import { DistributedLockService } from './distributed-lock.service';
import { DataSource, QueryRunner } from 'typeorm';
import { mock } from 'jest-mock-extended';

const mockQueryRunner = mock<QueryRunner>();
const mockDataSource = mock<DataSource>();
mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

describe('The DistributedLockService class', () => {
  let service: DistributedLockService;

  beforeEach(() => {
    service = new DistributedLockService(mockDataSource);
    jest.clearAllMocks();
    (mockDataSource.createQueryRunner as jest.Mock).mockReturnValue(
      mockQueryRunner
    );
  });

  describe('The withLock() method', () => {
    const fakeLockKey = 100001;

    describe('When the lock is acquired', () => {
      const fakeTask = jest.fn().mockResolvedValue(undefined);
      let result: boolean;

      beforeEach(async () => {
        mockQueryRunner.query
          .mockResolvedValueOnce([{ locked: true }])
          .mockResolvedValueOnce(undefined);

        result = await service.withLock(fakeLockKey, fakeTask);
      });

      it('should return true', () => {
        expect(result).toBe(true);
      });

      it('should execute the task', () => {
        expect(fakeTask).toHaveBeenCalledTimes(1);
      });

      it('should release the lock', () => {
        expect(mockQueryRunner.query).toHaveBeenCalledWith(
          'SELECT pg_advisory_unlock($1)',
          [fakeLockKey]
        );
      });

      it('should release the query runner connection', () => {
        expect(mockQueryRunner.release).toHaveBeenCalled();
      });
    });

    describe('When the lock is not acquired', () => {
      const fakeTask = jest.fn();
      let result: boolean;

      beforeEach(async () => {
        (mockQueryRunner.query as jest.Mock).mockResolvedValueOnce([
          { locked: false },
        ]);

        result = await service.withLock(fakeLockKey, fakeTask);
      });

      it('should return false', () => {
        expect(result).toBe(false);
      });

      it('should not execute the task', () => {
        expect(fakeTask).not.toHaveBeenCalled();
      });

      it('should not attempt to release the lock', () => {
        expect(mockQueryRunner.query).toHaveBeenCalledTimes(1);
      });

      it('should release the query runner connection', () => {
        expect(mockQueryRunner.release).toHaveBeenCalled();
      });
    });

    describe('When the task throws an error', () => {
      const expectedError = 'Task failed';
      const fakeTask = jest
        .fn()
        .mockRejectedValue(new Error(expectedError));
      let act: () => Promise<boolean>;

      beforeEach(() => {
        (mockQueryRunner.query as jest.Mock)
          .mockResolvedValueOnce([{ locked: true }])
          .mockResolvedValueOnce(undefined);

        act = () => service.withLock(fakeLockKey, fakeTask);
      });

      it('should propagate the error', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });

      it('should still release the lock', async () => {
        try {
          await act();
        } catch {
          // Expected
        }

        expect(mockQueryRunner.query).toHaveBeenCalledWith(
          'SELECT pg_advisory_unlock($1)',
          [fakeLockKey]
        );
      });

      it('should still release the query runner connection', async () => {
        try {
          await act();
        } catch {
          // Expected
        }

        expect(mockQueryRunner.release).toHaveBeenCalled();
      });
    });
  });
});
