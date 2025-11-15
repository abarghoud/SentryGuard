import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTokenStatusToUser1763195967869 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'token_status',
        type: 'varchar',
        length: '20',
        default: "'active'",
        isNullable: false,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'token_revoked_at',
        type: 'timestamp',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'token_revoked_at');

    await queryRunner.dropColumn('users', 'token_status');
  }
}