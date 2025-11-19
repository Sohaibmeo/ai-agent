import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/ai_agent_db'
});

export default pool;
