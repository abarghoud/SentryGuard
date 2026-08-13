import { MigrationInterface, QueryRunner } from "typeorm";

export class fixPushDeviceTokenIndex1780000000000 implements MigrationInterface {
    name = 'fixPushDeviceTokenIndex1780000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_push_device_tokens_token"`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_push_device_tokens_userId_token" ON "push_device_tokens" ("userId", "token")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_push_device_tokens_userId_token"`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_push_device_tokens_token" ON "push_device_tokens" ("token")`);
    }
}
