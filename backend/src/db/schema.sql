CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profile (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER,
  height_cm INTEGER,
  weight_kg INTEGER,
  activity_level TEXT,
  dietary_requirement TEXT,
  recipe_difficulty TEXT,
  portion_mode TEXT,
  weekly_budget_gbp NUMERIC(10,2),
  meal_breakfast BOOLEAN DEFAULT TRUE,
  meal_snack BOOLEAN DEFAULT TRUE,
  meal_lunch BOOLEAN DEFAULT TRUE,
  meal_dinner BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ingredients_preferred TEXT[] DEFAULT '{}',
  ingredients_avoid TEXT[] DEFAULT '{}',
  must_have_ingredients TEXT[] DEFAULT '{}',
  cuisines_liked TEXT[] DEFAULT '{}',
  cuisines_disliked TEXT[] DEFAULT '{}',
  recipes_preferred TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand TEXT,
  unit TEXT NOT NULL,
  kcal_per_unit NUMERIC(10,2) NOT NULL,
  protein_per_unit NUMERIC(10,2) NOT NULL,
  carbs_per_unit NUMERIC(10,2) NOT NULL,
  fat_per_unit NUMERIC(10,2) NOT NULL,
  estimated_price_per_unit NUMERIC(10,2) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_ingredient_price (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  price_per_unit NUMERIC(10,2) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  meal_slot TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  description TEXT,
  base_kcal NUMERIC(10,2),
  base_protein NUMERIC(10,2),
  base_carbs NUMERIC(10,2),
  base_fat NUMERIC(10,2),
  base_estimated_cost NUMERIC(10,2),
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC(10,2) NOT NULL,
  quantity_unit TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  total_estimated_cost NUMERIC(10,2),
  total_kcal NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weekly_plan_id UUID NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  date DATE,
  daily_estimated_cost NUMERIC(10,2),
  daily_kcal NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS plan_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_day_id UUID NOT NULL REFERENCES plan_days(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL,
  recipe_id UUID REFERENCES recipes(id),
  recipe_name TEXT NOT NULL,
  portion_multiplier NUMERIC(10,2) NOT NULL DEFAULT 1.0,
  kcal NUMERIC(10,2),
  protein NUMERIC(10,2),
  carbs NUMERIC(10,2),
  fat NUMERIC(10,2),
  estimated_cost NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS plan_meal_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_meal_id UUID NOT NULL REFERENCES plan_meals(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  quantity_unit TEXT NOT NULL,
  estimated_cost NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS pantry_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  have BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weekly_plan_id UUID NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  quantity_unit TEXT NOT NULL,
  estimated_cost NUMERIC(10,2),
  category TEXT,
  have BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS plan_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weekly_plan_id UUID NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_context JSONB NOT NULL,
  reason_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
