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
        mockQueryRunner.query.mockResolvedValueOnce([{ locked: true }]);

        result = await service.withLock(fakeLockKey, fakeTask);
      });

      it('should return true', () => {
        expect(result).toBe(true);
      });

      it('should execute the task', () => {
        expect(fakeTask).toHaveBeenCalledTimes(1);
      });

      it('should use a transaction-level advisory lock', () => {
        expect(mockQueryRunner.query).toHaveBeenCalledWith(
          'SELECT pg_try_advisory_xact_lock($1) AS locked',
          [fakeLockKey]
        );
      });

      it('should commit the transaction', () => {
        expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      });

      it('should not rollback the transaction', () => {
        expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      });

      it('should release the query runner connection', () => {
        expect(mockQueryRunner.release).toHaveBeenCalled();
      });
    });

    describe('When the lock is not acquired', () => {
      const fakeTask = jest.fn();
      let result: boolean;

      beforeEach(async () => {
        mockQueryRunner.query.mockResolvedValueOnce([{ locked: false }]);

        result = await service.withLock(fakeLockKey, fakeTask);
      });

      it('should return false', () => {
        expect(result).toBe(false);
      });

      it('should not execute the task', () => {
        expect(fakeTask).not.toHaveBeenCalled();
      });

      it('should rollback the transaction', () => {
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      });

      it('should not commit the transaction', () => {
        expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      });

      it('should release the query runner connection', () => {
        expect(mockQueryRunner.release).toHaveBeenCalled();
      });
    });

    describe('When the task throws an error', () => {
      const expectedError = 'Task failed';
      const fakeTask = jest.fn().mockRejectedValue(new Error(expectedError));
      let act: () => Promise<boolean>;

      beforeEach(() => {
        mockQueryRunner.query.mockResolvedValueOnce([{ locked: true }]);

        act = () => service.withLock(fakeLockKey, fakeTask);
      });

      it('should propagate the error', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });

      it('should rollback the transaction', async () => {
        try {
          await act();
        } catch {
          // Expected
        }

        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      });

      it('should not commit the transaction', async () => {
        try {
          await act();
        } catch {
          // Expected
        }

        expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
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