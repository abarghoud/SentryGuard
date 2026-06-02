import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeatureAnnouncementsTable1774500000000 implements MigrationInterface {
  name = 'CreateFeatureAnnouncementsTable1774500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "feature_announcements" (
        "key" character varying(255) NOT NULL,
        "released_at" TIMESTAMP NOT NULL DEFAULT now(),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_feature_announcements" PRIMARY KEY ("key")
      )`
    );

    await queryRunner.query(
      `INSERT INTO "feature_announcements" ("key", "is_active") VALUES ('break_in_offensive_response_v1', true)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "feature_announcements"`);
  }
}
