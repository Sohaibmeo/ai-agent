# 7. Key Flows: Generation, Swap, Modify, Save

This section describes the essential flows end-to-end: how weekly plans are generated, how individual meals are swapped or modified, and how plans are saved and turned into grocery lists.

## 7.1 Weekly Plan Generation Flow

1. **User Action**
   - On the Plans tab, the user clicks **“Generate New Week”**.

2. **Backend: Profile & Targets**
   - Backend receives `POST /api/plan/generate-week` with `userId` (from session or placeholder in V1).
   - It loads the `user_profile` and computes:
     - Daily calorie target.
     - Daily protein target.
   - It determines which meal slots are enabled (breakfast/snack/lunch/dinner).

3. **Backend: Candidate Recipes**
   - For each day (0–6) and each enabled meal slot:
     - Backend queries `recipes` where:
       - Diet tags are compatible with `user_profile.diet_type`.
       - All ingredients’ `allergen_keys` do **not** overlap `user_profile.allergy_keys`.
       - `difficulty <= max_difficulty`.
       - `meal_slot` matches the slot (`breakfast`, `lunch`, etc.).
     - It selects 3–10 recipes as candidates (for V1, a fixed limit like 5 is fine).
   - Backend builds a `candidateRecipes` JSON structure for the week.

4. **LLM: Coach Agent (Generate Mode)**
   - Backend builds a `profile` JSON and `candidateRecipes` JSON and calls the Coach Agent with `mode = "generate"`.
   - Coach Agent selects one recipe per day/slot and optionally decides portion multipliers, ensuring:
     - approximate adherence to calorie and protein targets;
     - variety of meals across the week;
     - use of only candidate recipes.

5. **Backend: Persist Plan**
   - The returned `WeeklyPlan` JSON is validated via Zod.
   - Backend writes to:
     - `weekly_plans` (status = `draft`).
     - `plan_days` for each day.
     - `plan_meals` for each selected recipe, calculating `meal_kcal`, `meal_protein`, `meal_cost_gbp` using recipe base data and multipliers.

6. **Backend: Generate Shopping List Draft**
   - Backend aggregates all ingredients across all `plan_meals` and recipes into `shopping_list_items` for the `weekly_plan_id`.
   - It sums `total_quantity` and uses ingredient price (or user override from `user_ingredient_price`) to compute `estimated_cost_gbp` per ingredient.
   - It computes and stores `total_estimated_cost_gbp` in `weekly_plans`.

7. **Frontend: Show Plan**
   - Backend returns the persisted `WeeklyPlan` with aggregated fields to the frontend.
   - The Plans tab displays the weekly grid of days and meals.

## 7.2 Swap Meal Flow (Simple Version, No LLM)

In V1, “Swap” can be implemented without involving the agents, as a simple backend selection based on filters.

1. **User Action**
   - On a specific meal card, user clicks **“Swap”**.

2. **Frontend: Request Candidate Recipes**
   - Calls `GET /api/recipes/candidates` with:
     - `weeklyPlanId`, `planDayId`, `planMealId`, `mealSlot`.
   - Backend returns a list of alternative recipes that are valid for this user and slot.

3. **Frontend: Recipe Selection UI**
   - A modal shows the list of candidate recipes with:
     - Name, base calories, base protein, cost, and a short description.
   - User selects one.

4. **Frontend: Apply Swap**
   - Sends `POST /api/plan/set-meal-recipe` with:
     - `planMealId`
     - `newRecipeId`

5. **Backend: Persist Change**
   - Updates `plan_meals.recipe_id` to `newRecipeId`.
   - Recalculates `meal_kcal`, `meal_protein`, `meal_cost_gbp` based on the new recipe and portion multiplier.
   - Recalculates `daily_kcal`, `daily_protein`, `daily_cost_gbp` for that day.
   - Regenerates the shopping list for that week (or just adjusts it incrementally).

6. **Frontend: Refresh**
   - Receives updated plan and re-renders the Plans tab.

Later, more advanced swap flows (“cheaper option”, “higher protein”) can be handled by the Review + Coach Agents, using this same structure.

## 7.3 Modify Meal Flow (Create Custom Recipe)

“Modify” is used when the user likes a meal concept but wants different ingredients or tweaks. It results in a **new custom recipe**.

1. **User Action**
   - On a meal card, user clicks **“Modify”**.

2. **Frontend: Load Recipe Details**
   - Calls `GET /api/recipes/:id` for the current `recipe_id`.
   - Backend returns:
     - Recipe name.
     - Meal slot.
     - Difficulty.
     - Ingredient list with quantities and units.
     - Instructions text (optional).

3. **Frontend: Ingredient Editor**
   - Shows ingredients in a form:
     - Each row: ingredient name, quantity, unit, (optionally cost and macros).
   - User can:
     - Remove an ingredient.
     - Add a new ingredient (from a search list).
     - Change quantity of an ingredient.

4. **Frontend: Save Modified Recipe**
   - On save, calls `POST /api/recipes/custom-from-existing` with:
     - `baseRecipeId`
     - New ingredient list (ingredient IDs and quantities).
   - Backend:
     - Creates new recipe:
       - `is_custom = true`
       - `created_by_user_id = userId`
     - Creates `recipe_ingredients` rows for the new recipe.
     - Computes base macros and cost using ingredient data and stores them in the new recipe.

5. **Backend: Update Plan Meal**
   - Backend updates `plan_meals.recipe_id` to the new custom `recipeId`.
   - Recomputes `meal_kcal`, `meal_protein`, etc. using the new recipe + existing `portion_multiplier`.
   - Recomputes daily totals and weekly totals.
   - Regenerates (or adjusts) shopping list items accordingly.

6. **Frontend: Refresh Plan**
   - Displays new recipe name and updated macros/cost in the plan view.

## 7.4 Save / Activate Plan Flow

1. **User Action**
   - When satisfied with the weekly plan, user clicks **“Save Plan”** or **“Activate Plan”**.

2. **Frontend**
   - Calls `POST /api/plan/activate` with `weeklyPlanId`.

3. **Backend**
   - Marks the given plan as `active` in `weekly_plans`.
   - Optionally marks previous plans as `archived`.
   - Ensures shopping list items are up-to-date.

4. **Frontend**
   - The Groceries tab now defaults to this active plan’s shopping list.

## 7.5 Grocery List Flow

1. **User Opens Groceries Tab**
   - Frontend calls `GET /api/shopping-list?weeklyPlanId=currentActive`.
   - Backend returns aggregated shopping list:

```json
[
  {
    "ingredientId": "ing_1",
    "name": "Chicken Breast",
    "category": "meat",
    "totalQuantity": 1500,
    "unit": "g",
    "estimatedCostGbp": 9.00,
    "hasInPantry": false
  },
  ...
]
```

2. **User Marks “I already have this”**
   - Frontend calls `POST /api/pantry/mark-have` with `ingredientId` and `hasItem = true`.
   - Backend updates `pantry_items`.
   - Optionally, the UI shows visually that item is “covered”.

3. **User Updates Price**
   - Opens a small form, enters:
     - Purchased quantity (e.g. 1kg).
     - Price paid (e.g. £4.50).
   - Frontend calls `POST /api/ingredients/user-price`.
   - Backend computes price per unit and upserts into `user_ingredient_price`.
   - Future cost estimates use this override for that ingredient and user.

4. **Budget Feedback**
   - Frontend can show:
     - `totalEstimatedCostGbp` from backend.
     - Comparison with `weekly_budget_gbp` from `user_profile`.
   - This gives user insight into whether the plan is within budget.

These flows are designed to be simple enough for Version 1 but robust enough to support enterprise expansion later (more agents, more complex adjustments, multi-week scheduling, etc.).
