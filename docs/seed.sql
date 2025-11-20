
INSERT INTO ingredients (name, category, unit_type, kcal_per_unit, protein_per_unit, carbs_per_unit, fat_per_unit, estimated_price_per_unit_gbp, allergen_keys)
VALUES
  ('Chicken Breast', 'meat', 'per_100g', 165, 31, 0, 3.6, 1.20, ARRAY[]::text[]),
  ('Broccoli', 'vegetable', 'per_100g', 35, 2.8, 7, 0.4, 0.50, ARRAY[]::text[]),
  ('Egg', 'dairy', 'per_piece', 78, 6, 0.6, 5, 0.20, ARRAY['egg']),
  ('Salmon', 'fish', 'per_100g', 208, 20, 0, 13, 2.00, ARRAY['fish']),
  ('Rice', 'grain', 'per_100g', 130, 2.7, 28, 0.3, 0.30, ARRAY['gluten']),
  ('Peanut Butter', 'spread', 'per_100g', 588, 25, 20, 50, 1.50, ARRAY['peanut', 'tree_nut']),
  ('Oats', 'grain', 'per_100g', 389, 17, 66, 7, 0.40, ARRAY['gluten']),
  ('Banana', 'fruit', 'per_piece', 105, 1.3, 27, 0.3, 0.25, ARRAY[]::text[]),
  ('Greek Yogurt', 'dairy', 'per_100g', 59, 10, 3.6, 0.4, 0.60, ARRAY['milk']),
  ('Almonds', 'nut', 'per_100g', 579, 21, 22, 50, 1.80, ARRAY['tree_nut']),
  ('Tofu', 'soy', 'per_100g', 76, 8, 1.9, 4.8, 0.70, ARRAY['soybean']),
  ('Spinach', 'vegetable', 'per_100g', 23, 2.9, 3.6, 0.4, 0.40, ARRAY[]::text[]),
  ('Whole Wheat Bread', 'grain', 'per_slice', 70, 3, 13, 1, 0.20, ARRAY['gluten']),
  ('Cheddar Cheese', 'dairy', 'per_100g', 402, 25, 1.3, 33, 1.50, ARRAY['milk']),
  ('Apple', 'fruit', 'per_piece', 95, 0.5, 25, 0.3, 0.30, ARRAY[]::text[]),
  ('Lentils', 'legume', 'per_100g', 116, 9, 20, 0.4, 0.60, ARRAY[]::text[]),
  ('Tomato', 'vegetable', 'per_100g', 18, 0.9, 3.9, 0.2, 0.30, ARRAY[]::text[]),
  ('Cucumber', 'vegetable', 'per_100g', 16, 0.7, 3.6, 0.1, 0.25, ARRAY[]::text[]),
  ('Chickpeas', 'legume', 'per_100g', 164, 9, 27, 2.6, 0.70, ARRAY[]::text[]),
  ('Avocado', 'fruit', 'per_piece', 160, 2, 9, 15, 1.00, ARRAY[]::text[]);


INSERT INTO recipes (name, meal_slot, diet_tags, difficulty, base_kcal, base_protein, base_carbs, base_fat, base_cost_gbp, is_custom, instructions)
VALUES
  -- Breakfast
  ('Peanut Butter Toast', 'breakfast', ARRAY['vegetarian'], 'super_easy', 250, 8, 30, 12, 0.80, FALSE, 'Spread peanut butter on toast.'),
  ('Oatmeal with Banana', 'breakfast', ARRAY['vegetarian', 'vegan'], 'easy', 220, 5, 45, 3, 0.60, FALSE, 'Cook oats, slice banana, combine.'),
  ('Greek Yogurt & Almonds', 'breakfast', ARRAY['vegetarian'], 'easy', 180, 12, 8, 8, 1.10, FALSE, 'Top yogurt with almonds.'),
  ('Tofu Scramble', 'breakfast', ARRAY['vegan'], 'easy', 150, 12, 4, 8, 0.90, FALSE, 'Scramble tofu with spinach and tomato.'),
  ('Egg & Spinach Wrap', 'breakfast', ARRAY['vegetarian'], 'medium', 210, 10, 20, 8, 1.00, FALSE, 'Wrap egg and spinach in whole wheat bread.'),
  ('Avocado Toast', 'breakfast', ARRAY['vegan'], 'super_easy', 190, 4, 25, 8, 1.20, FALSE, 'Spread avocado on whole wheat bread.'),
  ('Apple & Peanut Butter', 'breakfast', ARRAY['vegetarian'], 'super_easy', 180, 4, 28, 8, 0.70, FALSE, 'Slice apple, spread peanut butter.'),
  -- Lunch
  ('Grilled Chicken & Broccoli', 'lunch', ARRAY['halal', 'keto', 'low_carb'], 'easy', 300, 33, 7, 4, 2.00, FALSE, 'Grill chicken breast, steam broccoli, serve together.'),
  ('Egg Fried Rice', 'lunch', ARRAY['vegetarian'], 'medium', 350, 8, 40, 10, 1.80, FALSE, 'Fry rice with egg and vegetables.'),
  ('Lentil Salad', 'lunch', ARRAY['vegan', 'vegetarian'], 'easy', 250, 12, 35, 2, 1.20, FALSE, 'Mix lentils, tomato, cucumber, spinach.'),
  ('Chicken Avocado Wrap', 'lunch', ARRAY['halal'], 'medium', 320, 28, 25, 10, 2.20, FALSE, 'Wrap chicken, avocado, spinach in bread.'),
  ('Tofu & Broccoli Stir Fry', 'lunch', ARRAY['vegan'], 'easy', 210, 14, 10, 8, 1.10, FALSE, 'Stir fry tofu and broccoli.'),
  ('Chickpea Salad', 'lunch', ARRAY['vegan', 'vegetarian'], 'easy', 230, 9, 30, 6, 1.00, FALSE, 'Mix chickpeas, tomato, cucumber.'),
  ('Cheese & Tomato Sandwich', 'lunch', ARRAY['vegetarian'], 'super_easy', 270, 10, 30, 12, 1.00, FALSE, 'Layer cheese and tomato on bread.'),
  -- Dinner
  ('Salmon Rice Bowl', 'dinner', ARRAY['halal', 'pescatarian'], 'easy', 338, 22, 28, 13, 2.50, FALSE, 'Bake salmon, cook rice, combine in bowl.'),
  ('Chicken & Rice', 'dinner', ARRAY['halal'], 'easy', 350, 30, 40, 6, 2.30, FALSE, 'Cook chicken and rice together.'),
  ('Tofu Curry', 'dinner', ARRAY['vegan'], 'medium', 280, 15, 25, 10, 1.50, FALSE, 'Cook tofu with tomato and spices.'),
  ('Eggplant Lentil Stew', 'dinner', ARRAY['vegan', 'vegetarian'], 'medium', 240, 10, 35, 4, 1.30, FALSE, 'Stew eggplant and lentils.'),
  ('Grilled Salmon & Spinach', 'dinner', ARRAY['pescatarian'], 'easy', 320, 25, 6, 14, 2.60, FALSE, 'Grill salmon, serve with spinach.'),
  ('Chickpea & Rice Pilaf', 'dinner', ARRAY['vegan', 'vegetarian'], 'easy', 310, 8, 50, 6, 1.40, FALSE, 'Cook chickpeas and rice.'),
  ('Vegetable Stir Fry', 'dinner', ARRAY['vegan', 'vegetarian'], 'super_easy', 200, 6, 30, 4, 1.00, FALSE, 'Stir fry mixed vegetables.'),
  -- Snack
  ('Greek Yogurt & Banana', 'snack', ARRAY['vegetarian'], 'super_easy', 140, 7, 20, 2, 0.70, FALSE, 'Top yogurt with banana.'),
  ('Almonds & Apple', 'snack', ARRAY['vegetarian', 'vegan'], 'super_easy', 160, 4, 18, 8, 0.80, FALSE, 'Eat almonds and apple together.'),
  ('Peanut Butter Rice Cake', 'snack', ARRAY['vegetarian'], 'super_easy', 120, 4, 15, 6, 0.60, FALSE, 'Spread peanut butter on rice cake.'),
  ('Cucumber & Tomato Salad', 'snack', ARRAY['vegan', 'vegetarian'], 'super_easy', 60, 2, 10, 0, 0.50, FALSE, 'Mix cucumber and tomato.'),
  ('Cheese & Crackers', 'snack', ARRAY['vegetarian'], 'easy', 180, 8, 20, 10, 0.90, FALSE, 'Serve cheese with crackers.'),
  ('Banana & Almond Butter', 'snack', ARRAY['vegetarian', 'vegan'], 'easy', 150, 3, 20, 7, 0.80, FALSE, 'Slice banana, spread almond butter.'),
  ('Spinach & Tofu Bites', 'snack', ARRAY['vegan'], 'easy', 90, 6, 5, 4, 0.70, FALSE, 'Mix spinach and tofu, bake small bites.');


-- Recipe ingredients (IDs must match inserted recipes/ingredients)
-- For demonstration, you may need to adjust IDs after initial insert
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
VALUES
  -- Breakfast
  (1, 6, 30, 'g'), -- Peanut Butter Toast: Peanut Butter
  (2, 7, 50, 'g'), (2, 8, 1, 'piece'), -- Oatmeal with Banana: Oats, Banana
  (3, 9, 100, 'g'), (3, 10, 20, 'g'), -- Greek Yogurt & Almonds: Yogurt, Almonds
  (4, 11, 100, 'g'), (4, 12, 50, 'g'), (4, 17, 50, 'g'), -- Tofu Scramble: Tofu, Spinach, Tomato
  (5, 3, 1, 'piece'), (5, 12, 30, 'g'), (5, 13, 1, 'slice'), -- Egg & Spinach Wrap: Egg, Spinach, Bread
  (6, 20, 1, 'piece'), (6, 13, 1, 'slice'), -- Avocado Toast: Avocado, Bread
  (7, 15, 1, 'piece'), (7, 6, 20, 'g'), -- Apple & Peanut Butter: Apple, Peanut Butter
  -- Lunch
  (8, 1, 150, 'g'), (8, 2, 100, 'g'), -- Grilled Chicken & Broccoli: Chicken, Broccoli
  (9, 3, 2, 'piece'), (9, 5, 100, 'g'), -- Egg Fried Rice: Egg, Rice
  (10, 16, 100, 'g'), (10, 17, 50, 'g'), (10, 18, 50, 'g'), (10, 12, 30, 'g'), -- Lentil Salad: Lentils, Tomato, Cucumber, Spinach
  (11, 1, 100, 'g'), (11, 20, 1, 'piece'), (11, 12, 30, 'g'), (11, 13, 1, 'slice'), -- Chicken Avocado Wrap: Chicken, Avocado, Spinach, Bread
  (12, 11, 100, 'g'), (12, 2, 50, 'g'), -- Tofu & Broccoli Stir Fry: Tofu, Broccoli
  (13, 19, 100, 'g'), (13, 17, 50, 'g'), (13, 18, 50, 'g'), -- Chickpea Salad: Chickpeas, Tomato, Cucumber
  (14, 14, 50, 'g'), (14, 17, 30, 'g'), (14, 13, 2, 'slice'), -- Cheese & Tomato Sandwich: Cheese, Tomato, Bread
  -- Dinner
  (15, 4, 120, 'g'), (15, 5, 100, 'g'), -- Salmon Rice Bowl: Salmon, Rice
  (16, 1, 120, 'g'), (16, 5, 100, 'g'), -- Chicken & Rice: Chicken, Rice
  (17, 11, 100, 'g'), (17, 17, 50, 'g'), (17, 12, 30, 'g'), -- Tofu Curry: Tofu, Tomato, Spinach
  (18, 16, 100, 'g'), (18, 12, 30, 'g'), -- Eggplant Lentil Stew: Lentils, Spinach
  (19, 4, 120, 'g'), (19, 12, 30, 'g'), -- Grilled Salmon & Spinach: Salmon, Spinach
  (20, 19, 100, 'g'), (20, 5, 100, 'g'), -- Chickpea & Rice Pilaf: Chickpeas, Rice
  (21, 2, 100, 'g'), (21, 17, 50, 'g'), (21, 18, 50, 'g'), -- Vegetable Stir Fry: Broccoli, Tomato, Cucumber
  -- Snack
  (22, 9, 50, 'g'), (22, 8, 1, 'piece'), -- Greek Yogurt & Banana: Yogurt, Banana
  (23, 10, 20, 'g'), (23, 15, 1, 'piece'), -- Almonds & Apple: Almonds, Apple
  (24, 6, 20, 'g'), (24, 5, 1, 'piece'), -- Peanut Butter Rice Cake: Peanut Butter, Rice Cake (use rice as proxy)
  (25, 18, 50, 'g'), (25, 17, 50, 'g'), -- Cucumber & Tomato Salad: Cucumber, Tomato
  (26, 14, 30, 'g'), (26, 13, 2, 'slice'), -- Cheese & Crackers: Cheese, Bread (use bread as proxy)
  (27, 20, 1, 'piece'), (27, 10, 20, 'g'), -- Banana & Almond Butter: Banana, Almonds
  (28, 12, 30, 'g'), (28, 11, 50, 'g'); -- Spinach & Tofu Bites: Spinach, Tofu
