import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSentryPresenceAlertTypes1781000000000 implements MigrationInterface {
  name = 'AddSentryPresenceAlertTypes1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "alert_events_type_enum" ADD VALUE IF NOT EXISTS 'sustained_presence'`);
    await queryRunner.query(`ALTER TYPE "alert_events_type_enum" ADD VALUE IF NOT EXISTS 'sustained_presence_final'`);
    await queryRunner.query(`ALTER TYPE "alert_events_type_enum" ADD VALUE IF NOT EXISTS 'panic'`);
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing enum values without recreating the type.
    // Left as a no-op to avoid disrupting the live alert_events.type column.
  }
}
