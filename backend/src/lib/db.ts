import { Pool } from "pg";
import { env } from "../config/env.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export async function initDb() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      height_cm INTEGER NOT NULL,
      weight_kg INTEGER NOT NULL,
      age INTEGER NOT NULL,
      activity_level TEXT NOT NULL,
      weekly_budget_cents INTEGER NOT NULL,
      dietary_preferences TEXT[] NOT NULL DEFAULT '{}',
      excluded_ingredients TEXT[] NOT NULL DEFAULT '{}',
      fitness_goal TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT UNIQUE NOT NULL,
      meal_type TEXT NOT NULL,
      calories INTEGER NOT NULL,
      protein_grams INTEGER NOT NULL,
      carbs_grams INTEGER NOT NULL,
      fat_grams INTEGER NOT NULL,
      cost_cents INTEGER NOT NULL,
      diet_tags TEXT[] NOT NULL DEFAULT '{}',
      ingredients TEXT[] NOT NULL,
      instructions TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS meal_plans (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      summary TEXT NOT NULL,
      total_calories INTEGER NOT NULL,
      total_protein INTEGER NOT NULL,
      total_cost_cents INTEGER NOT NULL,
      plan_json JSONB NOT NULL,
      agent_version TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export function mapUser(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    age: row.age,
    activityLevel: row.activity_level,
    weeklyBudgetCents: row.weekly_budget_cents,
    dietaryPreferences: row.dietary_preferences ?? [],
    excludedIngredients: row.excluded_ingredients ?? [],
    fitnessGoal: row.fitness_goal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
