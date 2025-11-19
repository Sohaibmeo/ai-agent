# 6. Agents & Orchestrator

The system relies on two LLM agents and an orchestrator in the backend to handle plan selection and user-driven updates.

## 6.1 Review Agent

### Role

The **Review Agent** converts **user actions** (plus optional free-text feedback) into a structured `ReviewInstruction` object that the backend and Coach Agent can understand.

### Inputs

The Review Agent receives a JSON input containing at least:

- `actionContext`:
  - `type`: one of `swap_meal`, `modify_meal`, `swap_day`, `swap_week` (for future use), etc.
  - `planDayId` (optional)
  - `planMealId` (optional)
- `reasonText` (optional free-text explanation from the user, e.g. “I don’t like tuna”, “Make this cheaper”, “Too many carbs”).
- `currentPlan`:
  - A compact representation of the weekly plan (or at least the relevant day/meal).
- `profileSnippet`:
  - User goal, diet type, allergies, rough calorie/protein targets.

### Output: ReviewInstruction

A typical `ReviewInstruction` JSON object might look like:

```json
{
  "targetLevel": "meal",
  "action": "swap_meal",
  "targetIds": {
    "weeklyPlanId": "wp_123",
    "planDayId": "pd_3",
    "planMealId": "pm_45"
  },
  "params": {
    "preferCheaper": true,
    "avoidIngredients": ["tuna"],
    "keepCaloriesSimilar": true
  }
}
```

Fields:

- `targetLevel`: `"week" | "day" | "meal"`
- `action`:
  - `"swap_meal"` – change the recipe for a specific meal.
  - `"swap_day"` – change all meals for a specific day (future extension).
  - `"swap_week"` – re-run selection for the whole week (future extension).
  - `"modify_meal"` – used only when we want AI suggestions for modification; in V1, modifications are mostly manual.
- `targetIds`:
  - Relevant IDs for plan and meal.
- `params`:
  - Flags and constraints, such as:
    - `preferCheaper` (boolean)
    - `preferHigherProtein` (boolean)
    - `makeHealthier` (boolean)
    - `avoidIngredients` (string[])
    - `keepCaloriesSimilar` (boolean)

### Prompt Sketch for Review Agent

**System Message:**
```text
You are an assistant that interprets user actions on a meal plan.
Your job is to convert the action context and optional user reason into a precise JSON instruction ('ReviewInstruction').
Do not plan recipes or talk about food; only describe what should be changed in structured form.
```

**User Message:**
```text
Action context:
{actionContext JSON}

User reason (may be empty):
"{reasonText}"

Current plan (truncated if large):
{currentPlanSnippet}

User profile:
{profileSnippet}

Return a single ReviewInstruction JSON.
```

The Review Agent output is validated in the backend with a Zod schema before being used.

## 6.2 Coach Agent

### Role

The **Coach Agent** is a **recipe selector and planner**. It does not invent recipes. It picks recipes from candidate lists and assembles a 7-day plan or modifies parts of an existing plan.

### Inputs

The Coach Agent receives a JSON input containing:

- `mode`: `"generate"` or `"update"`
- `profile`: full profile including:
  - diet type, allergies, goal, calorie and protein targets, meal schedule, difficulty, budget (if needed).
- `currentPlan` (optional in `generate` mode; present in `update` mode).
- `reviewInstruction` (optional; required for update flows).
- `candidateRecipes`:
  - A structure containing, for each day and meal slot, a list of recipe candidates:

```json
{
  "days": [
    {
      "dayIndex": 0,
      "meals": [
        {
          "mealSlot": "breakfast",
          "candidates": [
            {
              "id": "rec_1",
              "name": "Greek Yogurt with Berries",
              "baseKcal": 350,
              "baseProtein": 25,
              "dietTags": ["halal", "vegetarian"],
              "difficulty": "easy"
            },
            ...
          ]
        },
        ...
      ]
    },
    ...
  ]
}
```

### Output: WeeklyPlan JSON

The Coach Agent must return a `WeeklyPlan` JSON object with the following shape (simplified):

```json
{
  "id": "temporary-or-empty",
  "userId": "user_123",
  "weekStartDate": "2025-01-06",
  "status": "draft",
  "days": [
    {
      "dayIndex": 0,
      "meals": [
        {
          "id": "temp-meal-1",
          "mealSlot": "breakfast",
          "recipeId": "rec_1",
          "portionMultiplier": 1.0
        }
      ]
    }
  ]
}
```

The backend will assign real IDs and compute macros and cost.

### Core Rules for Coach Agent

- Must **only** use recipe IDs that appear in the `candidateRecipes` lists.
- Must respect:
  - user diet type (already enforced by backend for candidates);
  - allergen exclusions (also enforced at candidate stage);
  - difficulty limit (candidates filtered);
  - meal schedule (only fill enabled meal slots);
  - variety (avoid using the same recipe more than 2 times per week, unless candidate pool is very small).
- Should aim to **approximate daily calorie & protein targets** using:
  - Base macros of candidate recipes.
  - Portion multipliers (if allowed in prompt).
- Must output well-formed `WeeklyPlan` JSON according to the Zod schema.

### Prompt Sketch for Coach Agent

**System Message:**
```text
You are a meal plan selector for a 7-day week.
You DO NOT invent recipes. You ONLY choose from the provided candidate recipes.
You MUST:
- respect the user's diet type and allergen restrictions,
- follow the user's meal schedule (only enabled slots),
- keep meals simple and easy (candidates are pre-filtered),
- aim for the daily calorie and protein targets,
- provide variety and avoid repeating the same recipe more than twice in a week,
- output a WeeklyPlan JSON that uses only recipeIds from the candidate lists.
Do not compute exact calorie numbers in the JSON; just choose appropriate recipes and portion multipliers.
```

**User Message:**
```text
Mode:
{mode}

User profile:
{profile JSON including calorie/protein targets}

Candidate recipes by day and meal slot:
{candidateRecipes JSON}

If mode is "update", here is the current plan:
{currentPlan JSON}

If mode is "update", here is the ReviewInstruction:
{reviewInstruction JSON}

Select the recipes and portion multipliers for each day and meal.
Return ONLY a valid WeeklyPlan JSON.
```

The backend validates the returned JSON using a Zod schema.

## 6.3 Orchestrator

The orchestrator is a backend module that coordinates:

- Candidate recipe selection.
- Review Agent invocation (for interpreting actions).
- Coach Agent invocation (for generating/updating the plan).
- Plan persistence and recomputation of macros and cost.

### 6.3.1 `generateWeeklyPlan(userId)`

Steps:

1. Load profile for `userId`.
2. Compute daily calorie and protein targets.
3. Build candidate recipes per day and meal slot by querying `recipes` with filters:
   - diet type, allergens, difficulty, meal slot.
4. Prepare `candidateRecipes` structure.
5. Build `profile` JSON for the Coach Agent.
6. Call Coach Agent with `mode: "generate"`.
7. Validate `WeeklyPlan` JSON via Zod.
8. Persist the plan in `weekly_plans`, `plan_days`, `plan_meals`.
9. Compute macros and cost per meal, per day, and per week.
10. Generate or update `shopping_list_items`.
11. Return the persisted `WeeklyPlan` to the frontend.

### 6.3.2 `handlePlanAction(userId, weeklyPlanId, actionContext, reasonText)`

Steps:

1. Load the current plan from DB by `weeklyPlanId` and ensure it belongs to `userId`.
2. If `actionContext.type` is purely deterministic (e.g. “swap using a specific selected recipe”), it may be handled directly without LLM. Otherwise:
   - Build `profileSnippet` JSON.
   - Call Review Agent with:
     - `actionContext`, `reasonText`, `currentPlan`, `profileSnippet`.
   - Validate and receive `ReviewInstruction` JSON.
3. Build candidate recipes for the relevant scope (e.g., for one meal, one day, or entire week depending on `ReviewInstruction`).
4. Call Coach Agent with `mode: "update"`, providing:
   - `profile`, `currentPlan`, `candidateRecipes`, `reviewInstruction`.
5. Validate the returned `WeeklyPlan` JSON via Zod.
6. Persist updates to the existing plan:
   - Update `plan_meals` rows (and optionally `plan_days` aggregated fields).
   - Recompute macros and cost for affected day(s).
   - Regenerate the shopping list if needed.
7. Return the updated plan to the frontend.

In V1, “Swap” can be implemented without the Review Agent or Coach Agent by letting the user manually pick an alternative recipe from a candidate list. However, the Orchestrator-based approach is designed to handle more complex future actions (e.g., “make this cheaper”, “make this higher protein”) via the LLM agents.
