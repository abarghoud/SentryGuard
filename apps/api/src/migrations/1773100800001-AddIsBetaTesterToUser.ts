import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsBetaTesterToUser1773100800001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'is_beta_tester',
        type: 'boolean',
        default: false,
        isNullable: false,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'is_beta_tester');
  }
}
