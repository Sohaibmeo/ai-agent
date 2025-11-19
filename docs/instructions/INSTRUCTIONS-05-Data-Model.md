# 5. Data Model / Database Overview

This section gives an overview of the main tables and their responsibilities. Exact SQL schemas can be derived from this description.

## 5.1 Users & Profile

### `users`
- `id` (PK)
- `email` (optional for V1 if no auth, can be a placeholder or demo ID)
- `created_at`
- `updated_at`

### `user_profile`
- `user_id` (PK, FK → users.id)
- `age`
- `height_cm`
- `weight_kg`
- `activity_level` (`sedentary`, `light`, `moderate`, `active`)
- `goal` (`lose_weight`, `maintain_weight`, `gain_weight`)
- `goal_intensity` (optional, e.g. numeric or enum)
- `diet_type` (one of the diet tags: `halal`, `vegan`, etc.)
- `allergy_keys` (array of allergen keys: `celery`, `gluten`, etc.)
- `breakfast_enabled` (boolean)
- `snack_enabled` (boolean)
- `lunch_enabled` (boolean)
- `dinner_enabled` (boolean)
- `max_difficulty` (`super_easy`, `easy`, `medium`, `hard`)
- `weekly_budget_gbp` (numeric, nullable)

## 5.2 Ingredients & Allergens

### `ingredients`
- `id` (PK)
- `name`
- `category` (e.g. `meat`, `fish`, `vegetable`, `grain`, `dairy`, etc.)
- `unit_type` (e.g. `per_100g`, `per_piece`, `per_ml`)
- `kcal_per_unit`
- `protein_per_unit`
- `carbs_per_unit`
- `fat_per_unit`
- `estimated_price_per_unit_gbp`
- `allergen_keys` (array of allergen keys: `peanut`, `milk`, etc.)

### `user_ingredient_price`
- `id` (PK)
- `user_id` (FK → users.id)
- `ingredient_id` (FK → ingredients.id)
- `price_per_unit_gbp` (numeric)
- `created_at`

This table stores user-specific price overrides based on real purchases.

## 5.3 Recipes

### `recipes`
- `id` (PK)
- `name`
- `meal_slot` (`breakfast`, `snack`, `lunch`, `dinner`)
- `diet_tags` (array: `halal`, `vegetarian`, etc.)
- `difficulty` (`super_easy`, `easy`, `medium`, `hard`)
- `base_kcal` (numeric)
- `base_protein` (numeric)
- `base_carbs` (numeric)
- `base_fat` (numeric)
- `base_cost_gbp` (numeric)
- `is_custom` (boolean, default `false`)
- `created_by_user_id` (nullable FK → users.id)
- `instructions` (text, optional; short cooking description)

Nutrition and cost fields can be computed by the backend from `recipe_ingredients` and `ingredients` and stored here for convenience and performance.

### `recipe_ingredients`
- `id` (PK)
- `recipe_id` (FK → recipes.id)
- `ingredient_id` (FK → ingredients.id)
- `quantity` (numeric)
- `unit` (e.g. `g`, `ml`, `piece`)

The combination of ingredients and quantities is used to compute recipe-level macros and cost.

## 5.4 Weekly Plans

### `weekly_plans`
- `id` (PK)
- `user_id` (FK → users.id)
- `week_start_date` (date)
- `status` (`draft`, `active`, `archived`)
- `total_estimated_cost_gbp` (numeric)
- `total_kcal` (numeric, optional)
- `created_at`
- `updated_at`

### `plan_days`
- `id` (PK)
- `weekly_plan_id` (FK → weekly_plans.id)
- `day_index` (0–6, e.g. 0 = Monday)
- `date` (date, optional if you want exact dates)
- `daily_kcal` (numeric)
- `daily_protein` (numeric)
- `daily_cost_gbp` (numeric)

### `plan_meals`
- `id` (PK)
- `plan_day_id` (FK → plan_days.id)
- `meal_slot` (`breakfast`, `snack`, `lunch`, `dinner`)
- `recipe_id` (FK → recipes.id)
- `portion_multiplier` (numeric, e.g. 1.0, 1.25)
- `meal_kcal` (numeric)
- `meal_protein` (numeric)
- `meal_carbs` (numeric)
- `meal_fat` (numeric)
- `meal_cost_gbp` (numeric)

For simplicity in V1, you may not need a separate `plan_meal_ingredients` table; meal macros and cost can be derived by:

1. Taking the recipe’s base macros and cost.
2. Applying `portion_multiplier`.

If you want per-meal ingredient breakdown for advanced features, you can add:

### (Optional) `plan_meal_ingredients`
- `id` (PK)
- `plan_meal_id` (FK → plan_meals.id)
- `ingredient_id` (FK → ingredients.id)
- `quantity` (numeric)
- `unit`

## 5.5 Shopping List & Pantry

### `shopping_list_items`
- `id` (PK)
- `weekly_plan_id` (FK → weekly_plans.id)
- `ingredient_id` (FK → ingredients.id)
- `total_quantity` (numeric)
- `unit` (e.g. `g`, `ml`, `piece`)
- `estimated_cost_gbp` (numeric)

### `pantry_items`
- `id` (PK)
- `user_id` (FK → users.id)
- `ingredient_id` (FK → ingredients.id)
- `has_item` (boolean)
- `updated_at`

The pantry is used to mark items the user already has so the shopping list and budget calculations can highlight actual purchase needs.

## 5.6 Custom Recipes

Custom recipes created by users (via the “Modify Meal” flow or a dedicated “Create Recipe” flow) are stored in `recipes` and `recipe_ingredients` with:

- `is_custom = true`
- `created_by_user_id = currentUserId`

When building candidate recipes for a specific user, the backend includes both:

- Global (seeded) recipes: `is_custom = false`.
- User-specific recipes: `is_custom = true AND created_by_user_id = userId`.

This allows the plan generator to use the user’s own creations in future plans.
