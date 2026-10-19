import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBreakInDetectionSettingsToVehicles1788000000000 implements MigrationInterface {
  name = 'AddBreakInDetectionSettingsToVehicles1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "vehicles_break_in_sensitivity_enum" AS ENUM('repeated_pulls', 'single_pull')`
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "break_in_sensitivity" "vehicles_break_in_sensitivity_enum" NOT NULL DEFAULT 'single_pull'`
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "break_in_reaction_delay_seconds" smallint NOT NULL DEFAULT 5`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "break_in_reaction_delay_seconds"`);
    await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "break_in_sensitivity"`);
    await queryRunner.query(`DROP TYPE "vehicles_break_in_sensitivity_enum"`);
  }
}
