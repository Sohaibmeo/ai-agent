# 4. Frontend Behaviour (Tabs & Screens)

The frontend is a React + TypeScript application with a main **Dashboard layout** and three primary tabs:

1. **Profile**
2. **Plans**
3. **Groceries**

The layout consists of a left sidebar navigation (tabs) and a main content area on the right.

## 4.1 Profile Tab

The **Profile** tab is used for onboarding and settings. It can be revisited at any time and changes affect future plan generations (but should not retroactively mutate already saved historical plans).

### 4.1.1 Fields Collected

1. **Basic Info**
   - Age (number)
   - Height (cm or ft/in with conversion)
   - Weight (kg)
   - Activity level (enum):
     - `sedentary`
     - `light`
     - `moderate`
     - `active`
   - Optionally: biological sex (for more precise calorie calculations later).

2. **Goal**
   - Goal (enum):
     - `lose_weight`
     - `maintain_weight`
     - `gain_weight`
   - Intensity:
     - For example, “Lose about 0.5 kg/week” or “Lose about 1 kg/week”.
     - This is optional for V1; a default moderate intensity can be assumed.

3. **Diet Type**
   - Single-select from diet tags:
     - `halal`, `kosher`, `vegan`, `vegetarian`, `pescatarian`, `keto`, `low_carb`, `low_fat`, `dairy_free`, `gluten_free`, `no_beef`, `no_seafood`, `no_pork`, `no_alcohol`.

4. **Allergies**
   - Multi-select from the 14 allergen categories:
     - `celery`, `gluten`, `crustaceans`, `egg`, `fish`, `lupin`, `milk`, `molluscs`, `mustard`, `peanut`, `sesame`, `soybean`, `sulphites`, `tree_nut`.

5. **Meal Schedule**
   - Toggles (checkboxes or switches):
     - `Breakfast` ON/OFF
     - `Snack` ON/OFF
     - `Lunch` ON/OFF
     - `Dinner` ON/OFF

6. **Difficulty**
   - Max difficulty (enum):
     - `super_easy`
     - `easy`
     - `medium`
     - (V1 can simply use `easy` and below).

7. **Weekly Budget**
   - Optional numeric input (GBP), e.g. “£40 per week”.

### 4.1.2 Interactions

- **Save Profile**:
  - Sends a `PUT /api/user/profile` with the full profile object.
  - On success, UI shows confirmation.
- **Load Profile on page load**:
  - Calls `GET /api/user/profile` to pre-fill fields.

For Version 1, no explicit “ingredient likes/dislikes” UI is required in the Profile. These can be added later based on usage.

## 4.2 Plans Tab

The **Plans** tab displays and manages weekly meal plans.

### 4.2.1 Layout

1. **Top Section – Generate / Current Plan**
   - Button: **“Generate New Week”**.
   - If a current plan exists:
     - Show a summary card:
       - Week start date.
       - Total estimated weekly cost.
       - Average or range of daily calories and protein.
       - Status (e.g. “Draft” or “Active”).

2. **Current Plan Detail**
   - A 7-day layout (e.g., Monday to Sunday) showing:
     - For each day:
       - Day name and date.
       - Daily totals: calories, protein, cost.
       - For each enabled meal slot (breakfast/snack/lunch/dinner):
         - A **Meal Card** with:
           - Recipe name.
           - Portion size label (e.g. “1.0x”, “1.25x”).
           - Meal-level calories and protein (optional for V1; daily totals are essential).
           - A **“Swap” text link** or icon.
           - A **“Modify” text link** or icon.

3. **Plan History (optional in V1)**
   - A simple list of previous saved weekly plans (read-only).

### 4.2.2 Actions on the Plan

#### Generate New Week
- When clicked:
  - Calls `POST /api/plan/generate-week`.
  - Backend returns a newly generated `WeeklyPlan` which becomes the current draft.
  - UI updates to show the new plan.

#### Swap Meal

- The user clicks “Swap” on a specific meal card.
- **Meaning**: “Choose a different recipe for this meal from a list of alternatives.”
- Recommended UX for V1 (no extra LLM call required):
  - Frontend calls `GET /api/recipes/candidates?slot=lunch&dayIndex=3` (or similar), passing relevant data.
  - Backend returns a list of recipes that are compatible (diet, allergens, difficulty).
  - UI opens a modal listing these recipes with basic info (name, calories, protein, cost).
  - User selects one.
  - Frontend sends `POST /api/plan/set-meal-recipe` with `planMealId` and `newRecipeId`.
  - Backend updates the plan in DB and returns the updated plan (with recalculated macros and cost).

Later, the Swap flow can optionally involve the Coach Agent to rank candidates, but V1 can be purely backend-driven selection without extra LLM calls.

#### Modify Meal

- The user clicks “Modify” on a meal card.
- **Meaning**: “Edit the ingredients of this meal to create a custom recipe.”

Flow:
1. Frontend requests full recipe detail (ingredients and amounts) via `GET /api/recipes/:id`.
2. UI shows an ingredient editor:
   - List of ingredients with quantities.
   - Ability to:
     - Add ingredient.
     - Remove ingredient.
     - Change quantity.
3. When user saves:
   - Frontend sends `POST /api/recipes/custom-from-existing` with:
     - Original recipe ID.
     - Modified ingredient list.
   - Backend:
     - Creates a new recipe row with `is_custom = true` and `created_by_user_id = currentUserId`.
     - Inserts appropriate `recipe_ingredients` rows.
   - Backend then updates the `plan_meals` row to reference the new custom `recipeId` and recalculates macros and cost.
4. UI refreshes the plan view with updated nutrition and cost.

### 4.2.3 Plan Finalization

When the user is satisfied with the weekly plan, they click **“Save Plan”** or **“Activate Plan”**.

- Frontend calls `POST /api/plan/save` (or similar) with the current `weeklyPlanId` or the in-memory representation.
- Backend:
  - Validates integrity.
  - Marks the plan as `active` (and older ones as `archived` or `superseded` if needed).
  - Generates or refreshes the **shopping list** for that week.

## 4.3 Groceries Tab

The **Groceries** tab shows the aggregated shopping list for the current active plan (or the selected plan, if plan history selection is implemented).

### 4.3.1 Layout

- Dropdown or selector for **Week / Plan** (default: current active plan).
- Shopping list grouped by category, for example:
  - Meat & Fish
  - Dairy & Eggs
  - Grains & Pasta
  - Vegetables
  - Fruits
  - Spices & Pantry
  - Other

For each ingredient item, show:

- Ingredient name.
- Total required quantity (with units).
- Estimated cost for that quantity.
- Checkbox **“I already have this”**.
- Text link **“Update price”**.

### 4.3.2 Interactions

#### Mark as “I already have this”

- When checked:
  - Frontend sends `POST /api/pantry/mark-have` with ingredient ID (and optional week ID).
  - Backend updates `pantry_items` table for that user.
- Groceries list should visually reduce or strike-through the item, and the **budget summary** can optionally be updated to reflect savings.

#### Update price

- Opens a small form where the user enters:
  - Actual amount (e.g., “1kg” or “500g”).
  - Price paid (e.g., “£4.50”).
- Frontend sends `POST /api/ingredients/user-price` with:
  - Ingredient ID.
  - Purchased quantity.
  - Price paid.
- Backend computes an **effective price per unit** and stores it in `user_ingredient_price` for that user.
- Future cost calculations for that ingredient and user use this override instead of the default estimated price.

### 4.3.3 Budget Summary

Optionally, the Groceries tab can show a **budget summary**:

- Total estimated cost for the week.
- Comparison with the user’s weekly budget (e.g., “Plan is £5 over your target budget”).

This summary should be updated after pantry and price overrides.
