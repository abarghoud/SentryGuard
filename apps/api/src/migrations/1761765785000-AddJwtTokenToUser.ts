import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddJwtTokenToUser1761765785000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add jwt_token column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'jwt_token',
        type: 'text',
        isNullable: true,
      })
    );

    // Add jwt_expires_at column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'jwt_expires_at',
        type: 'timestamp',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop jwt_expires_at column
    await queryRunner.dropColumn('users', 'jwt_expires_at');

    // Drop jwt_token column
    await queryRunner.dropColumn('users', 'jwt_token');
  }
}
