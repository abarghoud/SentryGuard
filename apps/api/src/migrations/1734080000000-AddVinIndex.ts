import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVinIndex1734080000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add index on vin column for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles (vin)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_vehicles_vin
    `);
  }
}

