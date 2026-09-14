import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMutedUntilToNotificationPreferences1784000000000 implements MigrationInterface {
  name = 'AddMutedUntilToNotificationPreferences1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notification_preferences" ADD "muted_until" TIMESTAMP`);
    await queryRunner.query(`
      INSERT INTO "notification_preferences" ("userId", "muted_until")
      SELECT tc."userId", tc.muted_until
      FROM "telegram_configs" tc
      WHERE tc.muted_until IS NOT NULL AND tc.muted_until > NOW()
      ON CONFLICT ("userId") DO UPDATE
      SET "muted_until" = EXCLUDED."muted_until"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notification_preferences" DROP COLUMN "muted_until"`);
  }
}
