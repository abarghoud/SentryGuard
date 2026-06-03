import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertFeatureAnnouncement1774500000002 implements MigrationInterface {
  name = 'InsertFeatureAnnouncement1774500000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "feature_announcements" ("key", "is_active")
       VALUES ('break_in_offensive_response_v1', true)
       ON CONFLICT ("key") DO NOTHING`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "feature_announcements" WHERE "key" = 'break_in_offensive_response_v1'`
    );
  }
}
