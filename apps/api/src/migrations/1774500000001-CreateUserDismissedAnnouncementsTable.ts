import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserDismissedAnnouncementsTable1774500000001 implements MigrationInterface {
  name = 'CreateUserDismissedAnnouncementsTable1774500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_dismissed_announcements" (
        "user_id" character varying(64) NOT NULL,
        "announcement_key" character varying(255) NOT NULL,
        "dismissed_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_dismissed_announcements" PRIMARY KEY ("user_id", "announcement_key")
      )`
    );

    await queryRunner.query(
      `ALTER TABLE "user_dismissed_announcements"
        ADD CONSTRAINT "FK_uda_user" FOREIGN KEY ("user_id") REFERENCES "users"("userId") ON DELETE CASCADE`
    );

    await queryRunner.query(
      `ALTER TABLE "user_dismissed_announcements"
        ADD CONSTRAINT "FK_uda_announcement" FOREIGN KEY ("announcement_key") REFERENCES "feature_announcements"("key") ON DELETE CASCADE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_dismissed_announcements" DROP CONSTRAINT "FK_uda_announcement"`
    );
    await queryRunner.query(
      `ALTER TABLE "user_dismissed_announcements" DROP CONSTRAINT "FK_uda_user"`
    );
    await queryRunner.query(`DROP TABLE "user_dismissed_announcements"`);
  }
}
