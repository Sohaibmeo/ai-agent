import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config(fs.existsSync(envPath) ? { path: envPath } : undefined);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/ai_agent_db'
});

export default pool;
