import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDebugMessagesToUser1762206782498 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'debug_messages',
        type: 'boolean',
        default: false,
        isNullable: false,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'debug_messages');
  }
}
