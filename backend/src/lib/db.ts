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
      region TEXT NOT NULL DEFAULT 'UK',
      height_cm INTEGER NOT NULL,
      weight_kg INTEGER NOT NULL,
      age INTEGER NOT NULL,
      activity_level TEXT NOT NULL,
      workout_frequency TEXT NOT NULL DEFAULT '3-4',
      goal TEXT NOT NULL DEFAULT 'MAINTAIN',
      weekly_budget_cents INTEGER NOT NULL,
      dietary_preferences TEXT[] NOT NULL DEFAULT '{}',
      excluded_ingredients TEXT[] NOT NULL DEFAULT '{}',
      meal_upload JSONB,
      favourite_meals JSONB DEFAULT '[]'::jsonb,
      fitness_goal TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'UK',
      ADD COLUMN IF NOT EXISTS workout_frequency TEXT NOT NULL DEFAULT '3-4',
      ADD COLUMN IF NOT EXISTS goal TEXT NOT NULL DEFAULT 'MAINTAIN',
      ADD COLUMN IF NOT EXISTS meal_upload JSONB,
      ADD COLUMN IF NOT EXISTS favourite_meals JSONB DEFAULT '[]'::jsonb`,
  );

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
      status TEXT NOT NULL DEFAULT 'draft',
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(
    `ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1`,
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_runs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agent_type TEXT NOT NULL,
      status TEXT NOT NULL,
      input_payload JSONB NOT NULL,
      output_payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      completed_at TIMESTAMPTZ
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS plan_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS plan_reviews (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
      user_request TEXT NOT NULL,
      agent_response JSONB,
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
    region: row.region,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    age: row.age,
    activityLevel: row.activity_level,
    workoutFrequency: row.workout_frequency,
    goal: row.goal,
    weeklyBudgetCents: row.weekly_budget_cents,
    dietaryPreferences: row.dietary_preferences ?? [],
    excludedIngredients: row.excluded_ingredients ?? [],
    mealUpload: row.meal_upload,
    favouriteMeals: row.favourite_meals ?? [],
    fitnessGoal: row.fitness_goal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
