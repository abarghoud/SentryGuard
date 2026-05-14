import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOffensiveResponseToVehicle1774000000000 implements MigrationInterface {
  name = 'AddOffensiveResponseToVehicle1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" RENAME COLUMN "offensive_response" TO "sentry_offensive_response"`
    );
    await queryRunner.query(
      `ALTER TYPE "vehicles_offensive_response_enum" RENAME TO "vehicles_sentry_offensive_response_enum"`
    );
    await queryRunner.query(
      `ALTER TYPE "vehicles_sentry_offensive_response_enum" ADD VALUE IF NOT EXISTS 'HONK'`
    );
    await queryRunner.query(
      `CREATE TYPE "vehicles_break_in_offensive_response_enum" AS ENUM('DISABLED', 'HONK')`
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "break_in_offensive_response" "vehicles_break_in_offensive_response_enum" NOT NULL DEFAULT 'DISABLED'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN "break_in_offensive_response"`
    );
    await queryRunner.query(
      `DROP TYPE "vehicles_break_in_offensive_response_enum"`
    );
    await queryRunner.query(
      `ALTER TYPE "vehicles_sentry_offensive_response_enum" RENAME TO "vehicles_offensive_response_enum"`
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" RENAME COLUMN "sentry_offensive_response" TO "offensive_response"`
    );
  }
}