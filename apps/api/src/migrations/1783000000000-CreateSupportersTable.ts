import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupportersTable1783000000000 implements MigrationInterface {
  name = 'CreateSupportersTable1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."supporters_type_enum" AS ENUM('donation', 'membership')`
    );
    await queryRunner.query(
      `CREATE TABLE "supporters" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "external_id" character varying(255),
        "name" character varying(255) NOT NULL,
        "email" character varying(255),
        "coffees" integer NOT NULL DEFAULT 1,
        "type" "public"."supporters_type_enum" NOT NULL DEFAULT 'donation',
        "is_active" boolean NOT NULL DEFAULT true,
        "message" text,
        "support_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_supporters_external_id" UNIQUE ("external_id"),
        CONSTRAINT "PK_supporters_id" PRIMARY KEY ("id")
      )`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_supporters_type_is_active" ON "supporters" ("type", "is_active")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_supporters_type_is_active"`);
    await queryRunner.query(`DROP TABLE "supporters"`);
    await queryRunner.query(`DROP TYPE "public"."supporters_type_enum"`);
  }
}
