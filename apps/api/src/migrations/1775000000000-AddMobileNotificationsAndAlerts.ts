import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMobileNotificationsAndAlerts1775000000000 implements MigrationInterface {
  name = 'AddMobileNotificationsAndAlerts1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."alert_events_type_enum" AS ENUM ('break_in', 'sentry')`);
    await queryRunner.query(`CREATE TYPE "public"."alert_events_severity_enum" AS ENUM ('critical', 'warning')`);
    await queryRunner.query(`
      CREATE TABLE "notification_preferences" (
        "userId" character varying(64) NOT NULL,
        "push_enabled" boolean NOT NULL DEFAULT false,
        "telegram_enabled" boolean NOT NULL DEFAULT true,
        "critical_only" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_preferences_userId" PRIMARY KEY ("userId")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "push_device_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying(64) NOT NULL,
        "token" text NOT NULL,
        "platform" character varying(32),
        "enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_push_device_tokens_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "alert_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying(64) NOT NULL,
        "vin" character varying(17) NOT NULL,
        "vehicle_display_name" character varying(255),
        "type" "public"."alert_events_type_enum" NOT NULL,
        "severity" "public"."alert_events_severity_enum" NOT NULL,
        "title" character varying(120) NOT NULL,
        "message" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alert_events_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_push_device_tokens_token" ON "push_device_tokens" ("token")`);
    await queryRunner.query(`CREATE INDEX "IDX_push_device_tokens_userId" ON "push_device_tokens" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_alert_events_userId_created_at" ON "alert_events" ("userId", "created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_alert_events_vin" ON "alert_events" ("vin")`);
    await queryRunner.query(`ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_notification_preferences_user" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "push_device_tokens" ADD CONSTRAINT "FK_push_device_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "alert_events" ADD CONSTRAINT "FK_alert_events_user" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert_events" DROP CONSTRAINT "FK_alert_events_user"`);
    await queryRunner.query(`ALTER TABLE "push_device_tokens" DROP CONSTRAINT "FK_push_device_tokens_user"`);
    await queryRunner.query(`ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_notification_preferences_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_alert_events_vin"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_alert_events_userId_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_push_device_tokens_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_push_device_tokens_token"`);
    await queryRunner.query(`DROP TABLE "alert_events"`);
    await queryRunner.query(`DROP TABLE "push_device_tokens"`);
    await queryRunner.query(`DROP TABLE "notification_preferences"`);
    await queryRunner.query(`DROP TYPE "public"."alert_events_severity_enum"`);
    await queryRunner.query(`DROP TYPE "public"."alert_events_type_enum"`);
  }
}
