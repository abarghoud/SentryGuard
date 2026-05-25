import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserSessions1775300000000 implements MigrationInterface {
  name = 'CreateUserSessions1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE TABLE "user_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying(64) NOT NULL,
        "jwt_hash" character varying(64) NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "revoked_at" TIMESTAMP,
        "last_used_at" TIMESTAMP,
        "device_type" character varying(32),
        "device_name" character varying(120),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_sessions_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_user_sessions_jwt_hash" ON "user_sessions" ("jwt_hash")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_sessions_userId_revoked_at_expires_at" ON "user_sessions" ("userId", "revoked_at", "expires_at")`);
    await queryRunner.query(`ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_user_sessions_user" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE`);
    await queryRunner.query(`
      INSERT INTO "user_sessions" ("userId", "jwt_hash", "expires_at")
      SELECT "userId", encode(digest("jwt_token", 'sha256'), 'hex'), "jwt_expires_at"
      FROM "users"
      WHERE "jwt_token" IS NOT NULL AND "jwt_expires_at" IS NOT NULL
      ON CONFLICT ("jwt_hash") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_sessions" DROP CONSTRAINT "FK_user_sessions_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_sessions_userId_revoked_at_expires_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_sessions_jwt_hash"`);
    await queryRunner.query(`DROP TABLE "user_sessions"`);
  }
}
