import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFartToOffensiveResponseEnum1778000000000 implements MigrationInterface {
  name = 'AddFartToOffensiveResponseEnum1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "vehicles_break_in_offensive_response_enum" ADD VALUE 'FART'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL does not support directly removing enum values.
    // In case of revert, the type is typically dropped or recreated, but since
    // it's a live system column, we leave it as no-op or log a caution.
  }
}
