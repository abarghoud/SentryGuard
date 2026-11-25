import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationChannelStateToAlertEvents1789000000000 implements MigrationInterface {
  name = 'AddNotificationChannelStateToAlertEvents1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "alert_events" ADD "notification_delivered_channels" text array NOT NULL DEFAULT '{}'`
    );
    await queryRunner.query(
      `ALTER TABLE "alert_events" ADD "notification_next_attempt_at" TIMESTAMP WITH TIME ZONE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert_events" DROP COLUMN "notification_next_attempt_at"`);
    await queryRunner.query(`ALTER TABLE "alert_events" DROP COLUMN "notification_delivered_channels"`);
  }
}
