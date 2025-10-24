import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../entities/user.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { TelegramConfig } from '../entities/telegram-config.entity';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'teslaguard',
    password: process.env.DATABASE_PASSWORD || 'teslaguard',
    database: process.env.DATABASE_NAME || 'teslaguard',
    entities: [User, Vehicle, TelegramConfig],
    synchronize: true,
    logging: process.env.DATABASE_LOGGING === 'true',
    ssl: false,
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
  entities: [User, Vehicle, TelegramConfig],
  migrations: [],
  synchronize: true,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;

