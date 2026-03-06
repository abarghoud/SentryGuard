import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMutedUntilToTelegramConfig1771000000000 implements MigrationInterface {
  name = 'AddMutedUntilToTelegramConfig1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "telegram_configs" ADD "muted_until" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "telegram_configs" DROP COLUMN "muted_until"`);
  }
}