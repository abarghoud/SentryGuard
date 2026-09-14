import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAlertSoundToNotificationPreferences1784000000000 implements MigrationInterface {
  name = 'AddAlertSoundToNotificationPreferences1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD "alert_sound" character varying(64) NOT NULL DEFAULT 'sentry_siren.wav'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN "alert_sound"`
    );
  }
}
