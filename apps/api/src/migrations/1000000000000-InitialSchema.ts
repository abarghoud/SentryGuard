import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1000000000000 implements MigrationInterface {
  name = 'InitialSchema1000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."telegram_configs_status_enum" AS ENUM ('pending', 'linked', 'expired')`
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "userId" character varying(64) NOT NULL,
        "email" character varying(255),
        "full_name" character varying(255),
        "profile_image_url" character varying(500),
        "access_token" text NOT NULL,
        "refresh_token" text NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
        CONSTRAINT "PK_8bf09ba754322ab9c22a215c919" PRIMARY KEY ("userId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying(64) NOT NULL,
        "vin" character varying(17) NOT NULL,
        "display_name" character varying(255),
        "model" character varying(100),
        "telemetry_enabled" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_954111abb378de281af9d02171" ON "vehicles" ("userId", "vin")`
    );

    await queryRunner.query(`
      CREATE TABLE "telegram_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying(64) NOT NULL,
        "chat_id" character varying(255),
        "link_token" character varying(128) NOT NULL,
        "status" "public"."telegram_configs_status_enum" NOT NULL DEFAULT 'pending',
        "linked_at" TIMESTAMP,
        "expires_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_03038cbf31ca475591aba45c395" UNIQUE ("link_token"),
        CONSTRAINT "REL_1e3297fdb479fa3e597e5421a2" UNIQUE ("userId"),
        CONSTRAINT "PK_da63e3a34937a3b335bccf91c84" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1e3297fdb479fa3e597e5421a2" ON "telegram_configs" ("userId")`
    );

    await queryRunner.query(`
      ALTER TABLE "vehicles"
      ADD CONSTRAINT "FK_20f139b9d79f917ef735efacb00"
      FOREIGN KEY ("userId") REFERENCES "users"("userId")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "telegram_configs"
      ADD CONSTRAINT "FK_1e3297fdb479fa3e597e5421a22"
      FOREIGN KEY ("userId") REFERENCES "users"("userId")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "telegram_configs" DROP CONSTRAINT "FK_1e3297fdb479fa3e597e5421a22"`
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "FK_20f139b9d79f917ef735efacb00"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1e3297fdb479fa3e597e5421a2"`
    );
    await queryRunner.query(`DROP TABLE "telegram_configs"`);
    await queryRunner.query(`DROP TYPE "public"."telegram_configs_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_954111abb378de281af9d02171"`
    );
    await queryRunner.query(`DROP TABLE "vehicles"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}