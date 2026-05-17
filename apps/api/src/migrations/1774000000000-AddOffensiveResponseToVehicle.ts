import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOffensiveResponseToVehicle1774000000000 implements MigrationInterface {
  name = 'AddOffensiveResponseToVehicle1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasBreakInColumn = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'break_in_offensive_response'`
    );

    if (hasBreakInColumn.length === 0) {
      await queryRunner.query(
        `CREATE TYPE "vehicles_break_in_offensive_response_enum" AS ENUM('DISABLED', 'HONK')`
      );
      await queryRunner.query(
        `ALTER TABLE "vehicles" ADD "break_in_offensive_response" "vehicles_break_in_offensive_response_enum" NOT NULL DEFAULT 'DISABLED'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN "break_in_offensive_response"`
    );
    await queryRunner.query(
      `DROP TYPE "vehicles_break_in_offensive_response_enum"`
    );
  }
}