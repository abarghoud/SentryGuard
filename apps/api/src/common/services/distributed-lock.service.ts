import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(private readonly dataSource: DataSource) {}

  public async withLock(
    lockKey: number,
    task: () => Promise<void>
  ): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const isLockAcquired = await this.tryAcquireLock(queryRunner, lockKey);

      if (!isLockAcquired) {
        this.logger.warn(`Lock ${lockKey} already held, skipping task`);
        await queryRunner.rollbackTransaction();
        return false;
      }

      try {
        await task();
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      }

      return true;
    } finally {
      await queryRunner.release();
    }
  }

  private async tryAcquireLock(
    queryRunner: QueryRunner,
    lockKey: number
  ): Promise<boolean> {
    const result = await queryRunner.query(
      `SELECT pg_try_advisory_xact_lock($1) AS locked`,
      [lockKey]
    );

    return result[0].locked;
  }
}
