import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBreakInMonitoringToVehicle1773100800002 implements MigrationInterface {
  name = 'AddBreakInMonitoringToVehicle1773100800002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "break_in_monitoring_enabled" boolean NOT NULL DEFAULT false`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN "break_in_monitoring_enabled"`
    );
  }
}
