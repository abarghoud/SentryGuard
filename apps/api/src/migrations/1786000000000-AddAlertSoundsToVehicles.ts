import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAlertSoundsToVehicles1786000000000 implements MigrationInterface {
  name = 'AddAlertSoundsToVehicles1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "sentry_alert_sound" character varying(64) NOT NULL DEFAULT 'default'`
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "break_in_alert_sound" character varying(64) NOT NULL DEFAULT 'default'`
    );
    await queryRunner.query(`ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "alert_sound"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "break_in_alert_sound"`);
    await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "sentry_alert_sound"`);
  }
}
