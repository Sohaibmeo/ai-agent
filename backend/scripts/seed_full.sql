-- Reset tables (caution: destructive)
TRUNCATE TABLE user_ingredient_price, pantry_items, shopping_list_items, plan_meals, plan_days, weekly_plans, recipe_ingredients, recipes, ingredients, user_profile, users RESTART IDENTITY CASCADE;

-- Users
INSERT INTO users (id, email) VALUES (uuid_generate_v4(), 'demo@example.com');

-- Ingredients
WITH ing AS (
  INSERT INTO ingredients (id, name, category, unit_type, kcal_per_unit, protein_per_unit, carbs_per_unit, fat_per_unit, estimated_price_per_unit_gbp, allergen_keys)
  VALUES
    (uuid_generate_v4(), 'Chicken Breast', 'meat', 'per_100g', 165, 31, 0, 3.6, 1.20, ARRAY[]::text[]),
    (uuid_generate_v4(), 'Broccoli', 'vegetable', 'per_100g', 35, 2.8, 7, 0.4, 0.50, ARRAY[]::text[]),
    (uuid_generate_v4(), 'Egg', 'dairy', 'per_piece', 78, 6, 0.6, 5, 0.20, ARRAY['egg']),
    (uuid_generate_v4(), 'Salmon', 'fish', 'per_100g', 208, 20, 0, 13, 2.00, ARRAY['fish']),
    (uuid_generate_v4(), 'Rice', 'grain', 'per_100g', 130, 2.7, 28, 0.3, 0.30, ARRAY[]::text[]),
    (uuid_generate_v4(), 'Peanut Butter', 'spread', 'per_100g', 588, 25, 20, 50, 1.50, ARRAY['peanut', 'tree_nut']),
    (uuid_generate_v4(), 'Oats', 'grain', 'per_100g', 389, 17, 66, 7, 0.40, ARRAY['gluten']),
    (uuid_generate_v4(), 'Banana', 'fruit', 'per_piece', 105, 1.3, 27, 0.3, 0.25, ARRAY[]::text[]),
    (uuid_generate_v4(), 'Greek Yogurt', 'dairy', 'per_100g', 59, 10, 3.6, 0.4, 0.60, ARRAY['milk']),
    (uuid_generate_v4(), 'Almonds', 'nut', 'per_100g', 579, 21, 22, 50, 1.80, ARRAY['tree_nut']),
    (uuid_generate_v4(), 'Tofu', 'soy', 'per_100g', 76, 8, 1.9, 4.8, 0.70, ARRAY['soybean']),
    (uuid_generate_v4(), 'Spinach', 'vegetable', 'per_100g', 23, 2.9, 3.6, 0.4, 0.40, ARRAY[]::text[]),
    (uuid_generate_v4(), 'Whole Wheat Bread', 'grain', 'per_slice', 70, 3, 13, 1, 0.20, ARRAY['gluten']),
    (uuid_generate_v4(), 'Cheddar Cheese', 'dairy', 'per_100g', 402, 25, 1.3, 33, 1.50, ARRAY['milk']),
    (uuid_generate_v4(), 'Apple', 'fruit', 'per_piece', 95, 0.5, 25, 0.3, 0.30, ARRAY[]::text[]),
    (uuid_generate_v4(), 'Lentils', 'legume', 'per_100g', 116, 9, 20, 0.4, 0.60, ARRAY[]::text[]),
    (uuid_generate_v4(), 'Tomato', 'vegetable', 'per_100g', 18, 0.9, 3.9, 0.2, 0.30, ARRAY[]::text[]),
    (uuid_generate_v4(), 'Cucumber', 'vegetable', 'per_100g', 16, 0.7, 3.6, 0.1, 0.25, ARRAY[]::text[]),
    (uuid_generate_v4(), 'Chickpeas', 'legume', 'per_100g', 164, 9, 27, 2.6, 0.70, ARRAY[]::text[]),
    (uuid_generate_v4(), 'Avocado', 'fruit', 'per_piece', 160, 2, 9, 15, 1.00, ARRAY[]::text[])
  RETURNING id, name
)
SELECT 1;

-- Recipes
WITH rec AS (
  INSERT INTO recipes (id, name, meal_slot, diet_tags, difficulty, base_kcal, base_protein, base_carbs, base_fat, base_cost_gbp, is_custom, instructions)
  VALUES
    -- Breakfast
    (uuid_generate_v4(), 'Peanut Butter Toast', 'breakfast', ARRAY['vegetarian'], 'super_easy', 250, 8, 30, 12, 0.80, FALSE, 'Spread peanut butter on toast.'),
    (uuid_generate_v4(), 'Oatmeal with Banana', 'breakfast', ARRAY['vegetarian', 'vegan'], 'easy', 220, 5, 45, 3, 0.60, FALSE, 'Cook oats, slice banana, combine.'),
    (uuid_generate_v4(), 'Greek Yogurt & Almonds', 'breakfast', ARRAY['vegetarian'], 'easy', 180, 12, 8, 8, 1.10, FALSE, 'Top yogurt with almonds.'),
    (uuid_generate_v4(), 'Tofu Scramble', 'breakfast', ARRAY['vegan'], 'easy', 150, 12, 4, 8, 0.90, FALSE, 'Scramble tofu with spinach and tomato.'),
    (uuid_generate_v4(), 'Egg & Spinach Wrap', 'breakfast', ARRAY['vegetarian'], 'medium', 210, 10, 20, 8, 1.00, FALSE, 'Wrap egg and spinach in whole wheat bread.'),
    (uuid_generate_v4(), 'Avocado Toast', 'breakfast', ARRAY['vegan'], 'super_easy', 190, 4, 25, 8, 1.20, FALSE, 'Spread avocado on whole wheat bread.'),
    (uuid_generate_v4(), 'Apple & Peanut Butter', 'breakfast', ARRAY['vegetarian'], 'super_easy', 180, 4, 28, 8, 0.70, FALSE, 'Slice apple, spread peanut butter.'),
    -- Lunch
    (uuid_generate_v4(), 'Grilled Chicken & Broccoli', 'lunch', ARRAY['halal', 'keto', 'low_carb'], 'easy', 300, 33, 7, 4, 2.00, FALSE, 'Grill chicken breast, steam broccoli, serve together.'),
    (uuid_generate_v4(), 'Egg Fried Rice', 'lunch', ARRAY['vegetarian'], 'medium', 350, 8, 40, 10, 1.80, FALSE, 'Fry rice with egg and vegetables.'),
    (uuid_generate_v4(), 'Lentil Salad', 'lunch', ARRAY['vegan', 'vegetarian'], 'easy', 250, 12, 35, 2, 1.20, FALSE, 'Mix lentils, tomato, cucumber, spinach.'),
    (uuid_generate_v4(), 'Chicken Avocado Wrap', 'lunch', ARRAY['halal'], 'medium', 320, 28, 25, 10, 2.20, FALSE, 'Wrap chicken, avocado, spinach in bread.'),
    (uuid_generate_v4(), 'Tofu & Broccoli Stir Fry', 'lunch', ARRAY['vegan'], 'easy', 210, 14, 10, 8, 1.10, FALSE, 'Stir fry tofu and broccoli.'),
    (uuid_generate_v4(), 'Chickpea Salad', 'lunch', ARRAY['vegan', 'vegetarian'], 'easy', 230, 9, 30, 6, 1.00, FALSE, 'Mix chickpeas, tomato, cucumber.'),
    (uuid_generate_v4(), 'Cheese & Tomato Sandwich', 'lunch', ARRAY['vegetarian'], 'super_easy', 270, 10, 30, 12, 1.00, FALSE, 'Layer cheese and tomato on bread.'),
    -- Dinner
    (uuid_generate_v4(), 'Salmon Rice Bowl', 'dinner', ARRAY['halal', 'pescatarian'], 'easy', 338, 22, 28, 13, 2.50, FALSE, 'Bake salmon, cook rice, combine in bowl.'),
    (uuid_generate_v4(), 'Chicken & Rice', 'dinner', ARRAY['halal'], 'easy', 350, 30, 40, 6, 2.30, FALSE, 'Cook chicken and rice together.'),
    (uuid_generate_v4(), 'Tofu Curry', 'dinner', ARRAY['vegan'], 'medium', 280, 15, 25, 10, 1.50, FALSE, 'Cook tofu with tomato and spices.'),
    (uuid_generate_v4(), 'Eggplant Lentil Stew', 'dinner', ARRAY['vegan', 'vegetarian'], 'medium', 240, 10, 35, 4, 1.30, FALSE, 'Stew eggplant and lentils.'),
    (uuid_generate_v4(), 'Grilled Salmon & Spinach', 'dinner', ARRAY['pescatarian'], 'easy', 320, 25, 6, 14, 2.60, FALSE, 'Grill salmon, serve with spinach.'),
    (uuid_generate_v4(), 'Chickpea & Rice Pilaf', 'dinner', ARRAY['vegan', 'vegetarian'], 'easy', 310, 8, 50, 6, 1.40, FALSE, 'Cook chickpeas and rice.'),
    (uuid_generate_v4(), 'Vegetable Stir Fry', 'dinner', ARRAY['vegan', 'vegetarian'], 'super_easy', 200, 6, 30, 4, 1.00, FALSE, 'Stir fry mixed vegetables.'),
    -- Snack
    (uuid_generate_v4(), 'Greek Yogurt & Banana', 'snack', ARRAY['vegetarian'], 'super_easy', 140, 7, 20, 2, 0.70, FALSE, 'Top yogurt with banana.'),
    (uuid_generate_v4(), 'Almonds & Apple', 'snack', ARRAY['vegetarian', 'vegan'], 'super_easy', 160, 4, 18, 8, 0.80, FALSE, 'Eat almonds and apple together.'),
    (uuid_generate_v4(), 'Peanut Butter Rice Cake', 'snack', ARRAY['vegetarian'], 'super_easy', 120, 4, 15, 6, 0.60, FALSE, 'Spread peanut butter on rice cake.'),
    (uuid_generate_v4(), 'Cucumber & Tomato Salad', 'snack', ARRAY['vegan', 'vegetarian'], 'super_easy', 60, 2, 10, 0, 0.50, FALSE, 'Mix cucumber and tomato.'),
    (uuid_generate_v4(), 'Cheese & Crackers', 'snack', ARRAY['vegetarian'], 'easy', 180, 8, 20, 10, 0.90, FALSE, 'Serve cheese with crackers.'),
    (uuid_generate_v4(), 'Banana & Almond Butter', 'snack', ARRAY['vegetarian', 'vegan'], 'easy', 150, 3, 20, 7, 0.80, FALSE, 'Slice banana, spread almond butter.'),
    (uuid_generate_v4(), 'Spinach & Tofu Bites', 'snack', ARRAY['vegan'], 'easy', 90, 6, 5, 4, 0.70, FALSE, 'Mix spinach and tofu, bake small bites.'),
    -- Extras
    (uuid_generate_v4(), 'High-Protein Yogurt Bowl', 'breakfast', ARRAY['halal', 'vegetarian'], 'easy', 292, 23, 29, 10, 1.29, FALSE, 'Greek yogurt topped with oats and almonds.'),
    (uuid_generate_v4(), 'Veggie Omelette Toast', 'breakfast', ARRAY['halal', 'vegetarian'], 'easy', 238, 16, 16, 11, 0.81, FALSE, 'Make a simple omelette with spinach and tomato, serve on whole wheat bread.'),
    (uuid_generate_v4(), 'Tofu Breakfast Bowl', 'breakfast', ARRAY['vegan', 'vegetarian'], 'medium', 305, 15, 50, 7, 1.19, FALSE, 'Warm tofu with oats, banana slices, and spinach in a bowl.'),
    (uuid_generate_v4(), 'Peanut Butter Banana Oats', 'breakfast', ARRAY['vegetarian'], 'easy', 388, 14, 63, 11, 0.68, FALSE, 'Cook oats and top with banana and peanut butter.'),
    (uuid_generate_v4(), 'Chicken Lentil Power Bowl', 'lunch', ARRAY['halal', 'low_carb'], 'medium', 270, 39, 18, 4, 1.89, FALSE, 'Serve grilled chicken with lentils, spinach and tomato in a bowl.'),
    (uuid_generate_v4(), 'Spiced Chickpea Rice Bowl', 'lunch', ARRAY['vegan', 'vegetarian'], 'easy', 278, 12, 52, 3, 1.10, FALSE, 'Serve chickpeas and rice with tomato and cucumber.'),
    (uuid_generate_v4(), 'Salmon Lentil Salad', 'lunch', ARRAY['halal', 'pescatarian'], 'medium', 248, 23, 14, 11, 2.17, FALSE, 'Flaked salmon served over warm lentils with spinach and tomato.'),
    (uuid_generate_v4(), 'Tofu Chickpea Stir Fry', 'lunch', ARRAY['vegan'], 'easy', 182, 14, 22, 6, 1.32, FALSE, 'Stir fry tofu with chickpeas, broccoli and tomato.'),
    (uuid_generate_v4(), 'Chicken Veggie Skillet', 'dinner', ARRAY['halal'], 'easy', 240, 41, 8, 5, 2.08, FALSE, 'Pan-cook chicken with broccoli, tomato and spinach.'),
    (uuid_generate_v4(), 'Low-Carb Chicken & Avocado Plate', 'dinner', ARRAY['halal', 'keto', 'low_carb'], 'easy', 287, 39, 6, 12, 2.10, FALSE, 'Serve grilled chicken with avocado slices and spinach.'),
    (uuid_generate_v4(), 'Lentil & Chickpea Curry Bowl', 'dinner', ARRAY['vegan', 'vegetarian'], 'medium', 222, 15, 38, 2, 1.21, FALSE, 'Simmer lentils and chickpeas with tomato and spinach.'),
    (uuid_generate_v4(), 'Tofu Rice Bowl', 'dinner', ARRAY['vegan'], 'easy', 207, 13, 29, 5, 1.35, FALSE, 'Serve tofu over rice with spinach and broccoli.'),
    (uuid_generate_v4(), 'Protein Yogurt Parfait', 'snack', ARRAY['halal', 'vegetarian'], 'easy', 288, 15, 45, 7, 0.99, FALSE, 'Layer Greek yogurt with oats, banana and almonds.'),
    (uuid_generate_v4(), 'Chickpea Crunch Cup', 'snack', ARRAY['vegan', 'vegetarian'], 'super_easy', 109, 6, 18, 2, 0.58, FALSE, 'Serve chickpeas with chopped tomato and cucumber.'),
    (uuid_generate_v4(), 'Egg & Cucumber Bites', 'snack', ARRAY['halal'], 'super_easy', 84, 6, 2, 5, 0.30, FALSE, 'Slice boiled egg and cucumber into bite-sized pieces.'),
    (uuid_generate_v4(), 'Apple Peanut Oat Bites', 'snack', ARRAY['vegetarian', 'vegan'], 'easy', 242, 7, 38, 9, 0.58, FALSE, 'Serve apple slices with a thin layer of peanut butter and a sprinkle of oats.')
  RETURNING id, name
)
SELECT 1;

-- Recipe Ingredients (resolve IDs by name)
\i scripts/seed_recipe_ingredients.sql
