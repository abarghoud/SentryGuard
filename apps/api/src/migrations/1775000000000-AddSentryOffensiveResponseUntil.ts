import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSentryOffensiveResponseUntil1775000000000 implements MigrationInterface {
  name = 'AddSentryOffensiveResponseUntil1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "sentry_offensive_response_until" TIMESTAMP`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN "sentry_offensive_response_until"`
    );
  }
}