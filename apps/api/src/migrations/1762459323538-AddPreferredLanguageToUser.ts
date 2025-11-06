import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPreferredLanguageToUser1762459323538 implements MigrationInterface {
    name = 'AddPreferredLanguageToUser1762459323538'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "preferred_language" character varying(2) NOT NULL DEFAULT 'en'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "preferred_language"`);
    }

}
