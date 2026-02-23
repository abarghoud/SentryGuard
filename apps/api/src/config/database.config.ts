import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../entities/user.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { TelegramConfig } from '../entities/telegram-config.entity';
import { UserConsent } from '../entities/user-consent.entity';
import { Waitlist } from '../entities/waitlist.entity';

const isProduction = process.env.NODE_ENV === 'production';

const requireProdEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be defined in production`);
  }
  return value;
};

const getEnvOrDefault = (name: string, fallback: string): string =>
  isProduction ? requireProdEnv(name) : process.env[name] || fallback;

const databaseHost = getEnvOrDefault('DATABASE_HOST', 'localhost');
const databaseUser = getEnvOrDefault('DATABASE_USER', 'sentryguard');
const databasePassword = getEnvOrDefault('DATABASE_PASSWORD', 'sentryguard');
const databaseName = getEnvOrDefault('DATABASE_NAME', 'sentryguard');
const databasePort = parseInt(process.env.DATABASE_PORT || '5432', 10);

const synchronize =
  process.env.DATABASE_SYNCHRONIZE === 'true' && !isProduction;
const migrationsRun =
  isProduction || process.env.DATABASE_RUN_MIGRATIONS === 'true';

/**
 * Get TypeORM configuration for NestJS application
 * - Migrations by default
 * - Synchronize only when explicitly enabled in non-production
 */
export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    host: databaseHost,
    invalidWhereValuesBehavior: {
      null: 'throw',
      undefined: 'throw',
    },
    port: databasePort,
    username: databaseUser,
    password: databasePassword,
    database: databaseName,
    entities: [User, Vehicle, TelegramConfig, UserConsent, Waitlist],
    synchronize,
    migrationsRun,
    migrations: ['dist/migrations/*.js'],
    logging: process.env.DATABASE_LOGGING === 'true',
    ssl: process.env.DATABASE_SSL === 'true',
    extra: {
      max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10000', 10),
      idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '300000', 10),
      allowExitOnIdle: false,
    },
  };
};

/**
 * DataSource for TypeORM CLI (migrations)
 * Used by: npm run migration:run, migration:generate, etc.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: databaseHost,
  invalidWhereValuesBehavior: {
    null: 'sql-null',
    undefined: 'throw',
  },
  port: databasePort,
  username: databaseUser,
  password: databasePassword,
  database: databaseName,
  entities: ['src/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: process.env.DATABASE_LOGGING === 'true',
  ssl: process.env.DATABASE_SSL === 'true'
};

// Default export for TypeORM CLI
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
