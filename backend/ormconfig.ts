import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as entities from './src/database/entities';

dotenv.config();

const defaultUrl =
  process.env.DATABASE_URL || 'postgresql://ai_user:ai_password@localhost:5432/ai_agent';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: defaultUrl,
  entities: Object.values(entities),
  migrations: ['src/migrations/*.ts'],
  synchronize: true,
  logging: false,
});
