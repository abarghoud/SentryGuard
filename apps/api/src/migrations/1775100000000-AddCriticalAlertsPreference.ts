import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCriticalAlertsPreference1775100000000 implements MigrationInterface {
  name = 'AddCriticalAlertsPreference1775100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notification_preferences" ADD "critical_alerts_enabled" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notification_preferences" DROP COLUMN "critical_alerts_enabled"`);
  }
}
