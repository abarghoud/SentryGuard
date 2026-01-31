import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailQueuedAtToWaitlist1769887894000 implements MigrationInterface {
    name = 'AddEmailQueuedAtToWaitlist1769887894000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waitlist" ADD "emailQueuedAt" TIMESTAMP`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1195519f5424c3f4704f9c1600"`);
        await queryRunner.query(`CREATE INDEX "IDX_1195519f5424c3f4704f9c1600" ON "waitlist" ("status", "emailQueuedAt", "welcomeEmailSentAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_1195519f5424c3f4704f9c1600"`);
        await queryRunner.query(`CREATE INDEX "IDX_1195519f5424c3f4704f9c1600" ON "waitlist" ("status", "welcomeEmailSentAt") `);
        await queryRunner.query(`ALTER TABLE "waitlist" DROP COLUMN "emailQueuedAt"`);
    }

}