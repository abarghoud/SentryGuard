import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveModelFromVehicles1772881200000 implements MigrationInterface {
    name = 'RemoveModelFromVehicles1772881200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "model"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "model" character varying(100)`);
    }

}