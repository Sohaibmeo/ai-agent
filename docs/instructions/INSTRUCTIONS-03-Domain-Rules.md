# 3. Core Domain Concepts & Rules

This section defines the main concepts used in the system: diet types, allergens, goals, meal schedule, and key constraints around recipes and ingredients.

## 3.1 Diet Types

Diet types constrain which recipes can be used. A recipe carries one or more diet tags. A user has a primary `diet_type` selection. The backend ensures that only recipes compatible with the user’s diet type are offered.

Supported diet types include (but are not limited to):

- `halal`
- `kosher`
- `vegan`
- `vegetarian`
- `pescatarian`
- `keto`
- `low_carb`
- `low_fat`
- `dairy_free`
- `gluten_free`
- `no_beef`
- `no_seafood`
- `no_pork`
- `no_alcohol`

A recipe can have multiple tags simultaneously, for example:

- A chickpea curry could be: `vegetarian`, `vegan`, `halal`, `dairy_free`.
- A grilled salmon dish could be: `pescatarian`, `halal`, `gluten_free`.

The backend uses these tags to **exclude** recipes that violate the user’s selection. For example:

- A user with `halal` must not see recipes with `no_halal` ingredients like pork, bacon, non-halal gelatin, or alcohol-based sauces.
- A user with `vegan` must not see any recipes containing animal products.

## 3.2 Allergens (14 UK Major Categories)

Allergen handling is central and must be strict. The system uses 14 canonical allergen categories, encoded as one-word keys:

1. `celery`
2. `gluten` (cereals containing gluten: wheat, rye, barley, oats)
3. `crustaceans` (e.g. prawns, crabs)
4. `egg`
5. `fish`
6. `lupin`
7. `milk`
8. `molluscs` (e.g. mussels, oysters)
9. `mustard`
10. `peanut`
11. `sesame`
12. `soybean`
13. `sulphites` (sulphur dioxide and sulphites > 10ppm)
14. `tree_nut` (e.g. almonds, hazelnuts, walnuts)

Each **ingredient** has a set of `allergen_keys: string[]` that indicate which (if any) major allergens it contains.

Each **user** selects one or more `allergy_keys: string[]` from the same list during onboarding.

The backend must ensure that **recipes containing any ingredient with an allergen that overlaps the user’s allergy list are excluded** when building candidate recipes. This is done via a join between recipes → recipe_ingredients → ingredients.

## 3.3 Goals

User goals are captured as an enum, e.g.:

- `lose_weight`
- `maintain_weight`
- `gain_weight`

In addition, the user can specify intensity (e.g. lose ~0.5 kg/week, or ~1 kg/week). The backend translates this into a **daily calorie target** and an approximate **protein target** based on body weight and activity.

Example heuristic (may be refined):

- Protein: `1.6–2.2 g/kg` of body weight (higher for cutting).
- Daily calories:
  - Estimate TDEE (Total Daily Energy Expenditure) using a standard formula.
  - Subtract 20–25% for fat loss, add 10–15% for muscle gain.

The Coach Agent uses caloric and protein targets as **soft constraints** when selecting recipes; the backend performs the exact sums and can highlight deviations.

## 3.4 Meal Schedule

The user can enable or disable standard meal slots:

- `breakfast_enabled` (boolean)
- `snacks_enabled` (boolean)
- `lunch_enabled` (boolean)
- `dinner_enabled` (boolean)

The plan generator must only fill the enabled meal slots for each day. For example, if snacks are disabled, no snack entries appear in the plan.

## 3.5 Difficulty Levels

Each recipe has a difficulty tag, e.g.:

- `super_easy`
- `easy`
- `medium`
- `hard`

The user chooses a **maximum difficulty** (e.g. “easy”).

The backend only selects recipes where `recipe.difficulty <= user.max_difficulty` when building candidate lists. For Version 1, it is sufficient to restrict to `super_easy` and `easy` for most users.

## 3.6 Portion Multipliers

Recipes have a base portion definition (e.g. “serves 1” with certain quantities). The system supports **portion multipliers** for each meal in the plan, such as:

- `0.75x`
- `1.0x` (default)
- `1.25x`
- `1.5x`

The backend scales:

- Calories = base_calories × multiplier
- Protein, Carbs, Fat = base_macro × multiplier
- Cost = base_cost × multiplier

Portion scaling is a powerful lever for fine-tuning macros without changing recipes.

## 3.7 Key Constraints & Guarantees

- **LLM never invents recipes.** Every recipe must exist in the `recipes` table.
- **LLM never computes calories or macros.** All numeric calculations happen in the backend, using `ingredients` with known macro and price data.
- **Diet and allergen rules are enforced by the backend**, via filters on ingredients and recipes.
- **User onboarding is minimal for V1**:
  - Basic profile (age, height, weight, activity level, goal).
  - Diet type (from the list of diet tags).
  - Allergies (from the 14 categories).
  - Meal schedule, difficulty, budget.
  - No “liked/disliked ingredients” are collected at onboarding; these can be inferred later from how the user swaps or modifies meals.
