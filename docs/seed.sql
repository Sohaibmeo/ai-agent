
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



INSERT INTO recipes (name, meal_slot, diet_tags, difficulty, base_kcal, base_protein, base_carbs, base_fat, base_cost_gbp, is_custom, instructions)
VALUES
  -- Extra Breakfasts (IDs ~29-32)
  ('High-Protein Yogurt Bowl', 'breakfast', ARRAY['halal', 'vegetarian'], 'easy',
   292, 23, 29, 10, 1.29, FALSE,
   'Greek yogurt topped with oats and almonds.'),
  ('Veggie Omelette Toast', 'breakfast', ARRAY['halal', 'vegetarian'], 'easy',
   238, 16, 16, 11, 0.81, FALSE,
   'Make a simple omelette with spinach and tomato, serve on whole wheat bread.'),
  ('Tofu Breakfast Bowl', 'breakfast', ARRAY['vegan', 'vegetarian'], 'medium',
   305, 15, 50, 7, 1.19, FALSE,
   'Warm tofu with oats, banana slices, and spinach in a bowl.'),
  ('Peanut Butter Banana Oats', 'breakfast', ARRAY['vegetarian'], 'easy',
   388, 14, 63, 11, 0.68, FALSE,
   'Cook oats and top with banana and peanut butter.'),

  -- Extra Lunches (IDs ~33-36)
  ('Chicken Lentil Power Bowl', 'lunch', ARRAY['halal', 'low_carb'], 'medium',
   270, 39, 18, 4, 1.89, FALSE,
   'Serve grilled chicken with lentils, spinach and tomato in a bowl.'),
  ('Spiced Chickpea Rice Bowl', 'lunch', ARRAY['vegan', 'vegetarian'], 'easy',
   278, 12, 52, 3, 1.10, FALSE,
   'Serve chickpeas and rice with tomato and cucumber.'),
  ('Salmon Lentil Salad', 'lunch', ARRAY['halal', 'pescatarian'], 'medium',
   248, 23, 14, 11, 2.17, FALSE,
   'Flaked salmon served over warm lentils with spinach and tomato.'),
  ('Tofu Chickpea Stir Fry', 'lunch', ARRAY['vegan'], 'easy',
   182, 14, 22, 6, 1.32, FALSE,
   'Stir fry tofu with chickpeas, broccoli and tomato.'),

  -- Extra Dinners (IDs ~37-40)
  ('Chicken Veggie Skillet', 'dinner', ARRAY['halal'], 'easy',
   240, 41, 8, 5, 2.08, FALSE,
   'Pan-cook chicken with broccoli, tomato and spinach.'),
  ('Low-Carb Chicken & Avocado Plate', 'dinner', ARRAY['halal', 'keto', 'low_carb'], 'easy',
   287, 39, 6, 12, 2.10, FALSE,
   'Serve grilled chicken with avocado slices and spinach.'),
  ('Lentil & Chickpea Curry Bowl', 'dinner', ARRAY['vegan', 'vegetarian'], 'medium',
   222, 15, 38, 2, 1.21, FALSE,
   'Simmer lentils and chickpeas with tomato and spinach.'),
  ('Tofu Rice Bowl', 'dinner', ARRAY['vegan'], 'easy',
   207, 13, 29, 5, 1.35, FALSE,
   'Serve tofu over rice with spinach and broccoli.'),

  -- Extra Snacks (IDs ~41-44)
  ('Protein Yogurt Parfait', 'snack', ARRAY['halal', 'vegetarian'], 'easy',
   288, 15, 45, 7, 0.99, FALSE,
   'Layer Greek yogurt with oats, banana and almonds.'),
  ('Chickpea Crunch Cup', 'snack', ARRAY['vegan', 'vegetarian'], 'super_easy',
   109, 6, 18, 2, 0.58, FALSE,
   'Serve chickpeas with chopped tomato and cucumber.'),
  ('Egg & Cucumber Bites', 'snack', ARRAY['halal'], 'super_easy',
   84, 6, 2, 5, 0.30, FALSE,
   'Slice boiled egg and cucumber into bite-sized pieces.'),
  ('Apple Peanut Oat Bites', 'snack', ARRAY['vegetarian', 'vegan'], 'easy',
   242, 7, 38, 9, 0.58, FALSE,
   'Serve apple slices with a thin layer of peanut butter and a sprinkle of oats.');

   -- Extra recipe_ingredients for new recipes
-- Adjust recipe_id values if your auto-increment IDs differ.

INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
VALUES
  -- High-Protein Yogurt Bowl (recipe_id = 29)
  (29, 9, 150, 'g'),   -- Greek Yogurt
  (29, 7, 30,  'g'),   -- Oats
  (29, 10, 15, 'g'),   -- Almonds

  -- Veggie Omelette Toast (30)
  (30, 3,  2,  'piece'), -- Egg
  (30, 12, 30, 'g'),     -- Spinach
  (30, 17, 30, 'g'),     -- Tomato
  (30, 13, 1,  'slice'), -- Whole Wheat Bread

  -- Tofu Breakfast Bowl (31)
  (31, 11, 100, 'g'),   -- Tofu
  (31, 7,  30,  'g'),   -- Oats
  (31, 8,  1,   'piece'), -- Banana
  (31, 12, 30,  'g'),   -- Spinach

  -- Peanut Butter Banana Oats (32)
  (32, 7,  50,  'g'),   -- Oats
  (32, 8,  1,   'piece'), -- Banana
  (32, 6,  15,  'g'),   -- Peanut Butter

  -- Chicken Lentil Power Bowl (33)
  (33, 1,  100, 'g'),   -- Chicken Breast
  (33, 16, 80,  'g'),   -- Lentils
  (33, 12, 30,  'g'),   -- Spinach
  (33, 17, 30,  'g'),   -- Tomato

  -- Spiced Chickpea Rice Bowl (34)
  (34, 19, 100, 'g'),   -- Chickpeas
  (34, 5,  80,  'g'),   -- Rice
  (34, 17, 30,  'g'),   -- Tomato
  (34, 18, 30,  'g'),   -- Cucumber

  -- Salmon Lentil Salad (35)
  (35, 4,  80,  'g'),   -- Salmon
  (35, 16, 60,  'g'),   -- Lentils
  (35, 12, 30,  'g'),   -- Spinach
  (35, 17, 30,  'g'),   -- Tomato

  -- Tofu Chickpea Stir Fry (36)
  (36, 11, 80,  'g'),   -- Tofu
  (36, 19, 60,  'g'),   -- Chickpeas
  (36, 2,  50,  'g'),   -- Broccoli
  (36, 17, 30,  'g'),   -- Tomato

  -- Chicken Veggie Skillet (37)
  (37, 1,  120, 'g'),   -- Chicken Breast
  (37, 2,  80,  'g'),   -- Broccoli
  (37, 17, 40,  'g'),   -- Tomato
  (37, 12, 30,  'g'),   -- Spinach

  -- Low-Carb Chicken & Avocado Plate (38)
  (38, 1,  120, 'g'),     -- Chicken Breast
  (38, 20, 0.5, 'piece'), -- Avocado
  (38, 12, 40,  'g'),     -- Spinach

  -- Lentil & Chickpea Curry Bowl (39)
  (39, 16, 80,  'g'),   -- Lentils
  (39, 19, 70,  'g'),   -- Chickpeas
  (39, 17, 40,  'g'),   -- Tomato
  (39, 12, 30,  'g'),   -- Spinach

  -- Tofu Rice Bowl (40)
  (40, 11, 100, 'g'),   -- Tofu
  (40, 5,  80,  'g'),   -- Rice
  (40, 12, 40,  'g'),   -- Spinach
  (40, 2,  50,  'g'),   -- Broccoli

  -- Protein Yogurt Parfait (41)
  (41, 9,  80,  'g'),   -- Greek Yogurt
  (41, 7,  20,  'g'),   -- Oats
  (41, 8,  1,   'piece'), -- Banana
  (41, 10, 10,  'g'),   -- Almonds

  -- Chickpea Crunch Cup (42)
  (42, 19, 60,  'g'),   -- Chickpeas
  (42, 17, 30,  'g'),   -- Tomato
  (42, 18, 30,  'g'),   -- Cucumber

  -- Egg & Cucumber Bites (43)
  (43, 3,  1,   'piece'), -- Egg
  (43, 18, 40,  'g'),     -- Cucumber

  -- Apple Peanut Oat Bites (44)
  (44, 15, 1,   'piece'), -- Apple
  (44, 6,  15,  'g'),     -- Peanut Butter
  (44, 7,  15,  'g');     -- Oats
