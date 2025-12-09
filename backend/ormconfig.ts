import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as entities from './src/database/entities';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(process.env.DATABASE_URL
    ? {
        url: process.env.DATABASE_URL,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'ai_user',
        password: process.env.DB_PASSWORD || 'ai_password',
        database: process.env.DB_NAME || 'ai_agent',
      }),
  entities: Object.values(entities),
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
