import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameTelemetryEnabledToSentryModeMonitoringEnabled1773100800003 implements MigrationInterface {
  name = 'RenameTelemetryEnabledToSentryModeMonitoringEnabled1773100800003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" RENAME COLUMN "telemetry_enabled" TO "sentry_mode_monitoring_enabled"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" RENAME COLUMN "sentry_mode_monitoring_enabled" TO "telemetry_enabled"`
    );
  }
}
