import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../entities/user.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { TelegramConfig } from '../entities/telegram-config.entity';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Get TypeORM configuration for NestJS application
 * - Development: synchronize = true (auto schema updates)
 * - Production: synchronize = false, migrationsRun = true (manual migrations)
 */
export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'teslaguard',
    password: process.env.DATABASE_PASSWORD || 'teslaguard',
    database: process.env.DATABASE_NAME || 'teslaguard',
    entities: [User, Vehicle, TelegramConfig],
    // Use synchronize in development, migrations in production
    synchronize: !isProduction,
    migrationsRun: isProduction,
    migrations: ['dist/migrations/*.js'],
    logging: process.env.DATABASE_LOGGING === 'true',
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? {
            rejectUnauthorized: false,
          }
        : false,
  };
};

/**
 * DataSource for TypeORM CLI (migrations)
 * Used by: npm run migration:run, migration:generate, etc.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'teslaguard',
  password: process.env.DATABASE_PASSWORD || 'teslaguard',
  database: process.env.DATABASE_NAME || 'teslaguard',
  entities: ['src/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: process.env.DATABASE_LOGGING === 'true',
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? {
          rejectUnauthorized: false,
        }
      : false,
};

// Default export for TypeORM CLI
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
