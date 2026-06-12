import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveObsoleteJwtColumnsFromUser1779000000000 implements MigrationInterface {
  public name = 'RemoveObsoleteJwtColumnsFromUser1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'jwt_expires_at');
    await queryRunner.dropColumn('users', 'jwt_token');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'jwt_token',
        type: 'text',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'jwt_expires_at',
        type: 'timestamp',
        isNullable: true,
      })
    );
  }
}
