import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOnboardingColumnsToUser1768900000000 implements MigrationInterface {
    name = 'AddOnboardingColumnsToUser1768900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "onboarding_completed" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "onboarding_skipped" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "onboarding_skipped"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "onboarding_completed"`);
    }

}
