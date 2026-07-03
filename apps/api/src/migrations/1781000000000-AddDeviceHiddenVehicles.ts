import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceHiddenVehicles1781000000000 implements MigrationInterface {
  name = 'AddDeviceHiddenVehicles1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "device_hidden_vehicles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying(64) NOT NULL,
        "installationId" character varying(128) NOT NULL,
        "vin" character varying(17) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_device_hidden_vehicles_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_device_hidden_vehicles_uniq" ON "device_hidden_vehicles" ("userId", "installationId", "vin")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_device_hidden_vehicles_userId_vin" ON "device_hidden_vehicles" ("userId", "vin")`
    );
    await queryRunner.query(
      `ALTER TABLE "device_hidden_vehicles" ADD CONSTRAINT "FK_device_hidden_vehicles_user" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE`
    );
    await queryRunner.query(
      `ALTER TABLE "push_device_tokens" ADD "installationId" character varying(128)`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_push_device_tokens_installationId" ON "push_device_tokens" ("installationId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_push_device_tokens_installationId"`);
    await queryRunner.query(`ALTER TABLE "push_device_tokens" DROP COLUMN "installationId"`);
    await queryRunner.query(
      `ALTER TABLE "device_hidden_vehicles" DROP CONSTRAINT "FK_device_hidden_vehicles_user"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_device_hidden_vehicles_userId_vin"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_device_hidden_vehicles_uniq"`);
    await queryRunner.query(`DROP TABLE "device_hidden_vehicles"`);
  }
}
