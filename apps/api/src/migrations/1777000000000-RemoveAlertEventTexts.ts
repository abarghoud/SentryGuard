import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAlertEventTexts1777000000000 implements MigrationInterface {
  name = 'RemoveAlertEventTexts1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert_events" DROP COLUMN IF EXISTS "title"`);
    await queryRunner.query(`ALTER TABLE "alert_events" DROP COLUMN IF EXISTS "message"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert_events" ADD "title" character varying(120) NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "alert_events" ADD "message" text NOT NULL DEFAULT ''`);
  }
}
