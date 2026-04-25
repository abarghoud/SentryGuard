import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOffensiveResponseToVehicle1774000000000 implements MigrationInterface {
  name = 'AddOffensiveResponseToVehicle1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "vehicles_offensive_response_enum" AS ENUM('DISABLED', 'FLASH', 'HONK', 'FLASH_AND_HONK')`
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "offensive_response" "vehicles_offensive_response_enum" NOT NULL DEFAULT 'DISABLED'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN "offensive_response"`
    );
    await queryRunner.query(
      `DROP TYPE "vehicles_offensive_response_enum"`
    );
  }
}