import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRefreshTokenTrackingToUser1770508800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'refresh_token_expires_at',
        type: 'timestamp',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'refresh_token_updated_at',
        type: 'timestamp',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'refresh_token_updated_at');
    await queryRunner.dropColumn('users', 'refresh_token_expires_at');
  }
}
