import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBreakInAutoSentryModeToVehicle1781000000000 implements MigrationInterface {
  name = 'AddBreakInAutoSentryModeToVehicle1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "break_in_auto_sentry_mode_enabled" boolean NOT NULL DEFAULT false`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN "break_in_auto_sentry_mode_enabled"`
    );
  }
}
