-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User profile table
CREATE TABLE user_profile (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    age INTEGER,
    height_cm INTEGER,
    weight_kg INTEGER,
    activity_level VARCHAR(20),
    goal VARCHAR(20),
    goal_intensity VARCHAR(20),
    diet_type VARCHAR(20),
    allergy_keys TEXT[],
    breakfast_enabled BOOLEAN,
    snack_enabled BOOLEAN,
    lunch_enabled BOOLEAN,
    dinner_enabled BOOLEAN,
    max_difficulty VARCHAR(20),
    weekly_budget_gbp NUMERIC
);

-- Ingredients table
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    category VARCHAR(50),
    unit_type VARCHAR(20),
    kcal_per_unit NUMERIC,
    protein_per_unit NUMERIC,
    carbs_per_unit NUMERIC,
    fat_per_unit NUMERIC,
    estimated_price_per_unit_gbp NUMERIC,
    allergen_keys TEXT[]
);

-- User ingredient price overrides
CREATE TABLE user_ingredient_price (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    ingredient_id INTEGER REFERENCES ingredients(id),
    price_per_unit_gbp NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipes table
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    meal_slot VARCHAR(20),
    diet_tags TEXT[],
    difficulty VARCHAR(20),
    base_kcal NUMERIC,
    base_protein NUMERIC,
    base_carbs NUMERIC,
    base_fat NUMERIC,
    base_cost_gbp NUMERIC,
    is_custom BOOLEAN DEFAULT FALSE,
    created_by_user_id INTEGER REFERENCES users(id),
    instructions TEXT
);

-- Recipe ingredients table
CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id),
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity NUMERIC,
    unit VARCHAR(20)
);

-- Weekly plans table
CREATE TABLE weekly_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    week_start_date DATE,
    status VARCHAR(20),
    total_estimated_cost_gbp NUMERIC,
    total_kcal NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plan days table
CREATE TABLE plan_days (
    id SERIAL PRIMARY KEY,
    weekly_plan_id INTEGER REFERENCES weekly_plans(id),
    day_index INTEGER,
    date DATE,
    daily_kcal NUMERIC,
    daily_protein NUMERIC,
    daily_cost_gbp NUMERIC
);

-- Plan meals table
CREATE TABLE plan_meals (
    id SERIAL PRIMARY KEY,
    plan_day_id INTEGER REFERENCES plan_days(id),
    meal_slot VARCHAR(20),
    recipe_id INTEGER REFERENCES recipes(id),
    portion_multiplier NUMERIC,
    meal_kcal NUMERIC,
    meal_protein NUMERIC,
    meal_cost_gbp NUMERIC
);

-- Shopping list items table
CREATE TABLE shopping_list_items (
    id SERIAL PRIMARY KEY,
    weekly_plan_id INTEGER REFERENCES weekly_plans(id),
    ingredient_id INTEGER REFERENCES ingredients(id),
    total_quantity NUMERIC,
    unit VARCHAR(20),
    estimated_cost_gbp NUMERIC
);
