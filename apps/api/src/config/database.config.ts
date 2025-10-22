import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'teslaguard',
    password: process.env.DATABASE_PASSWORD || 'teslaguard',
    database: process.env.DATABASE_NAME || 'teslaguard',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: !isProduction, // Auto-sync schema in dev, disable in production
    logging: process.env.DATABASE_LOGGING === 'true',
    ssl: isProduction
      ? {
          rejectUnauthorized: false,
        }
      : false,
  };
};

// DataSource for migrations (if needed later)
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'teslaguard',
  password: process.env.DATABASE_PASSWORD || 'teslaguard',
  database: process.env.DATABASE_NAME || 'teslaguard',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;

