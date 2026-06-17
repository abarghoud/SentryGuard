import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVehicleAlertTypesToAlertEventEnum1780000000000 implements MigrationInterface {
  name = 'AddVehicleAlertTypesToAlertEventEnum1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "alert_events_type_enum" ADD VALUE IF NOT EXISTS 'alarm'`);
    await queryRunner.query(`ALTER TYPE "alert_events_type_enum" ADD VALUE IF NOT EXISTS 'intrusion_attempt'`);
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing enum values without recreating the type.
    // Left as a no-op to avoid disrupting the live alert_events.type column.
  }
}
