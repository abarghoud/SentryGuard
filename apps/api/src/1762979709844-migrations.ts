import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserConsentTable1762979709844 implements MigrationInterface {
    name = 'CreateUserConsentTable1762979709844'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_consents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying(64) NOT NULL, "version" character varying(10) NOT NULL, "textHash" character varying(64) NOT NULL, "acceptedAt" TIMESTAMP NOT NULL, "locale" character varying(2) NOT NULL, "ipAddress" character varying(45) NOT NULL, "userAgent" text NOT NULL, "appTitle" character varying(100) NOT NULL, "partnerName" character varying(100) NOT NULL, "vehiclesSnapshot" jsonb, "revokedAt" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_65e4c6d6204ad8719abf4b30326" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_user_consents_userId" ON "user_consents" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_consents_acceptedAt" ON "user_consents" ("acceptedAt")`);
        await queryRunner.query(`ALTER TABLE "user_consents" ADD CONSTRAINT "FK_7a8097efad75fcbc548d467d648" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_consents" DROP CONSTRAINT "FK_7a8097efad75fcbc548d467d648"`);
        await queryRunner.query(`DROP INDEX "IDX_user_consents_acceptedAt"`);
        await queryRunner.query(`DROP INDEX "IDX_user_consents_userId"`);
        await queryRunner.query(`DROP TABLE "user_consents"`);
    }

}
