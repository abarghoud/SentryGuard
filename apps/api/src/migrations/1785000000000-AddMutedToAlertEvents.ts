import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMutedToAlertEvents1785000000000 implements MigrationInterface {
  name = 'AddMutedToAlertEvents1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert_events" ADD "muted" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert_events" DROP COLUMN "muted"`);
  }
}
