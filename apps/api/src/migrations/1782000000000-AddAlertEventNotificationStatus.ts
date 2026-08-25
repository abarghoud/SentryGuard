import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAlertEventNotificationStatus1782000000000 implements MigrationInterface {
  name = 'AddAlertEventNotificationStatus1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."alert_events_notification_status_enum" AS ENUM('pending', 'sent', 'failed')`
    );
    await queryRunner.query(
      `ALTER TABLE "alert_events" ADD "notification_status" "public"."alert_events_notification_status_enum"`
    );
    await queryRunner.query(
      `ALTER TABLE "alert_events" ALTER COLUMN "notification_status" SET DEFAULT 'pending'`
    );
    await queryRunner.query(
      `ALTER TABLE "alert_events" ADD "notification_attempts" integer NOT NULL DEFAULT 0`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_alert_events_pending" ON "alert_events" ("notification_status") WHERE "notification_status" = 'pending'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_alert_events_pending"`);
    await queryRunner.query(`ALTER TABLE "alert_events" DROP COLUMN "notification_attempts"`);
    await queryRunner.query(`ALTER TABLE "alert_events" DROP COLUMN "notification_status"`);
    await queryRunner.query(`DROP TYPE "public"."alert_events_notification_status_enum"`);
  }
}
