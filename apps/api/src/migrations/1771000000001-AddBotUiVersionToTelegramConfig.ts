import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBotUiVersionToTelegramConfig1771000000001 implements MigrationInterface {
  name = 'AddBotUiVersionToTelegramConfig1771000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "telegram_configs" ADD "bot_ui_version" integer NOT NULL DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "telegram_configs" DROP COLUMN "bot_ui_version"`);
  }
}