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

      const isLockAcquired = await this.tryAcquireLock(queryRunner, lockKey);

      if (!isLockAcquired) {
        this.logger.warn(`Lock ${lockKey} already held, skipping task`);
        return false;
      }

      try {
        await task();
      } finally {
        await this.releaseLock(queryRunner, lockKey);
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
      `SELECT pg_try_advisory_lock($1) AS locked`,
      [lockKey]
    );

    return result[0].locked;
  }

  private async releaseLock(
    queryRunner: QueryRunner,
    lockKey: number
  ): Promise<void> {
    await queryRunner.query(`SELECT pg_advisory_unlock($1)`, [lockKey]);
  }
}
