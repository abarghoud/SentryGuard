import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWaitlistTable1768862520289 implements MigrationInterface {
    name = 'CreateWaitlistTable1768862520289'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."waitlist_status_enum" AS ENUM('pending', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "waitlist" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "fullName" character varying(255), "status" "public"."waitlist_status_enum" NOT NULL DEFAULT 'pending', "approvedAt" TIMESTAMP, "welcomeEmailSentAt" TIMESTAMP, "preferredLanguage" character varying(2) NOT NULL DEFAULT 'en', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_973cfbedc6381485681d6a6916c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2221cffeeb64bff14201bd5b3d" ON "waitlist" ("email") `);
        await queryRunner.query(`CREATE INDEX "IDX_1195519f5424c3f4704f9c1600" ON "waitlist" ("status", "welcomeEmailSentAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_1195519f5424c3f4704f9c1600"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2221cffeeb64bff14201bd5b3d"`);
        await queryRunner.query(`DROP TABLE "waitlist"`);
        await queryRunner.query(`DROP TYPE "public"."waitlist_status_enum"`);
    }

}
