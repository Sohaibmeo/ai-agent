# CODEX-INSTRUCTIONS-BACKEND.md
AI-Powered Meal Planning Platform – Backend Instructions for Code Generation

This document is **only for the backend**. It is written as instructions for an AI code generator (like GitHub Copilot / OpenAI Codex / GPT) to extend and maintain the backend of this project safely.

---

## 0. Purpose & Product (Backend View)

We are building a **UK-focused, AI-assisted 7-day meal planning system**.

Backend responsibilities:

- Handle **all real logic**: plan generation, macros, costs, filtering, preferences, and shopping lists.
- Use LLMs only for **structured decisions and instructions**, never for raw data like macros or prices.
- Expose clean REST APIs for a React frontend (Profile, Plans, Groceries).

Key rules:

- LLM **never invents recipes**, nutrients, or prices.
- LLM only selects among **existing recipes** and returns structured JSON instructions.
- Backend computes all **macros, costs, and shopping lists** deterministically from the database.

---

## 1. Tech Stack & Architecture

### 1.1. Tech Stack

- **Language**: TypeScript
- **Framework**: NestJS
- **Database**: PostgreSQL + TypeORM
- **Validation**: Zod for all LLM JSON outputs
- **LLM**: Local OpenAI-compatible endpoint (Ollama etc.) with optional OpenAI `gpt-5.1-mini`

### 1.2. Back-end Modules (high-level)

Existing modules (do not radically change structure):

- `users` / `profiles` – user profile + plan defaults
- `preferences` – explicit preferences and scores (recipes, ingredients)
- `ingredients` – ingredient catalog, prices, allergens, user price overrides
- `recipes` – recipe catalog, difficulty, diet tags, meal slot, meal_type, recipe-ingredient joins
- `plans` – weekly plans, days, meals, lifecycle
- `shopping-list` – aggregated shopping list per plan
- `agents` – LLM integration (Review Agent, Coach Agent, others)
- `database` – migrations/seeding
- `common` – shared utilities

When adding new logic, respect these module boundaries and add new services/controllers inside the appropriate module rather than creating monolith services.

---

## 2. Invariants & Non‑Negotiable Rules

1. **LLM never fabricates nutrient or price data.**
   - All nutrients and prices come from DB recipes/ingredients.
   - LLM can **choose** recipes or suggest actions but not invent new ones in V2.

2. **Deterministic logic wins over AI:**
   - Plan generation must always work even if LLM is off or fails.
   - LLM output must be validated with Zod; on failure, fallback to deterministic logic.

3. **Diet & allergen safety:**
   - Respect diet type (e.g., Halal, Vegan, etc.) and 14 UK allergens at the DB filtering level.
   - Allergies behave like **hard filters** (no recipes containing the allergen).
   - Diet behaves like a **filter and/or tag** (avoid non-compliant recipes).

4. **Budget & macros:**
   - Backend is responsible for calculating approximate weekly/daily cost and calories/protein.
   - V2 budget logic: “good enough” heuristics, not full optimization.

5. **Plan lifecycle:**
   - Plans are stored per user, per week.
   - Exactly one plan can be “active” at a time per user.
   - Generating a new plan can create a new `weekly_plan` with status `draft` or `active` (depending on design).

---

## 3. Data Model (Backend Perspective)

Tables (simplified):

- `users`
- `user_profile`
- `user_preferences`
- `ingredients`
- `user_ingredient_price`
- `user_ingredient_score`
- `pantry_items`
- `recipes`
- `recipe_ingredients`
- `weekly_plans`
- `plan_days`
- `plan_meals`
- `shopping_list_items`
- `user_recipe_score`

Additional V2 column:

- `recipes.meal_type` = `'solid' | 'drinkable'`

Rules:

- `recipes` have:
  - `meal_slot` (breakfast/snack/lunch/dinner)
  - `meal_type` (solid/drinkable)
  - `difficulty`
  - `diet_tags`
- `recipe_ingredients` join recipes to `ingredients` with quantity/unit.
- `ingredients` include approximate cost per unit and allergen keys.
- `user_ingredient_price` allows user-specific cost overrides.
- `user_recipe_score` and `user_ingredient_score` store simple preference scores.

Do not redesign the schema dramatically unless explicitly instructed. Extend rather than break.

---

## 4. Plan Engine & Generation Logic

### 4.1. Plan generation (core)

Function: e.g. `PlansService.generateWeek(userId, options)`

Responsibilities:

- Load `user_profile` and `user_preferences`.
- Compute daily calorie/protein targets based on profile and goal.
- Determine enabled meal slots (breakfast/snack/lunch/dinner) from profile and/or overrides.
- For each day and enabled slot:
  - Fetch candidate recipes from `RecipesService.findCandidatesForUser(...)`:
    - Filter by meal slot.
    - Respect diet & allergies.
    - Respect max difficulty.
    - Apply recipe and ingredient preference scores.
  - Either:
    - Use **Coach Agent** (if `useAgent = true`) to pick recipes from candidates, or
    - Use deterministic selection logic (fallback).
  - Compute `portion_multiplier` to approach target calories/protein for the day (heuristic, not perfect).
  - Save `plan_days` and `plan_meals`.

- After building all days:
  - Recompute daily and weekly aggregates: calories & cost.
  - Trigger shopping list rebuild for the plan.

The plan engine must be fully functional without the LLM.

### 4.2. Budget awareness (V2)

Add simple budget heuristics:

- From profile/plan settings, get `weekly_budget_gbp`.
- Compute `dailyBudget = weeklyBudget / 7`.
- When ranking candidate recipes for a meal, consider:
  - `estimatedCostSoFarForDay`
  - `candidateCost`
- Deprioritize candidates that push daily cost far above budget (`> dailyBudget * 1.3`) when other options exist.

Keep it approximate, not perfect.

---

## 5. Candidate Selection & Preferences

### 5.1. RecipesService.findCandidatesForUser

This service should:

- Filter recipes by:
  - `meal_slot`
  - `meal_type` if requested (for drinkable vs solid)
  - `diet_tags` vs user diet type
  - allergens vs user allergy list
  - maximum difficulty
- Join `user_recipe_score` for the user and use it to rank recipes.
- Join `recipe_ingredients` → `user_ingredient_score` for the user to apply penalties for explicitly avoided ingredients.

Ranking:

- Start with a base score (0).
- Add recipe score (positive for liked, negative for disliked).
- Subtract penalties for ingredients marked as “avoid in future”.
- Optionally adjust score slightly by cost vs budget (lower cost preferred if near budget).
- Sort by final score descending and return up to a fixed limit (e.g. 10).

### 5.2. Ingredient scores (V2)

You must only adjust `user_ingredient_score` when the user explicitly chooses “Avoid this ingredient in future” in the UI.

- When that action is triggered:
  - Insert or update `user_ingredient_score` for that ingredient with a **strong negative** score (e.g., -5 or -10).
- This should make recipes containing that ingredient drop in ranking, but not behave like an allergy (do not hard filter).

---

## 6. Review Agent V2

The Review Agent is an LLM-powered component that interprets **UI actions + natural language reasons** into **structured instructions** for the plan engine.

It does not directly change DB state. It only returns instructions; the orchestrator applies them.

### 6.1. ReviewInstruction schema

Create a dedicated schema (type + Zod) in `src/agents/schemas`:

```ts
export type TargetLevel = 'week' | 'day' | 'meal' | 'ingredient';

export type ActionType =
  | 'generate_new_week'
  | 'regenerate_week'
  | 'regenerate_day'
  | 'regenerate_meal'
  | 'swap_ingredient'
  | 'remove_ingredient'
  | 'avoid_ingredient_future'
  | 'adjust_portion'
  | 'change_meal_type';

export interface ReviewInstructionParams {
  ingredientToRemove?: string;
  ingredientToAdd?: string;
  applyToWholeWeek?: boolean;

  makeHealthier?: boolean;
  makeCheaper?: boolean;
  makeHigherProtein?: boolean;
  keepCaloriesSimilar?: boolean;

  smallerPortion?: boolean;
  largerPortion?: boolean;

  preferMealType?: 'solid' | 'drinkable';
}

export interface ReviewInstruction {
  targetLevel: TargetLevel;
  targetIds?: {
    weeklyPlanId?: string;
    planDayId?: string;
    planMealId?: string;
    ingredientId?: string;
  };
  action: ActionType;
  params?: ReviewInstructionParams;
  notes?: string;
}
```

Use Zod to validate all Review Agent outputs. If validation fails, log it and do nothing or fallback to a no-op.

### 6.2. Review Agent input

Define an input shape like:

```ts
interface ReviewAgentInput {
  userId: string;
  weeklyPlanId: string;
  actionContext: {
    type:
      | 'regenerate_week'
      | 'regenerate_day'
      | 'regenerate_meal'
      | 'swap_ingredient'
      | 'remove_ingredient'
      | 'avoid_ingredient_future'
      | 'change_meal_type'
      | 'adjust_portion';
    planDayId?: string;
    planMealId?: string;
    ingredientId?: string;
    ingredientName?: string;
  };
  reasonText?: string;
  profileSnippet: {
    goal: string;
    dietType: string;
    weeklyBudgetGbp?: number | null;
  };
  currentPlanSummary: any; // compact representation
}
```

### 6.3. Review Agent behaviour

The Review Agent should:

- Use the `actionContext.type` as a strong hint.
- Combine it with `reasonText`, `profileSnippet`, and `currentPlanSummary` to decide:
  - Target level (`week`, `day`, `meal`, `ingredient`)
  - Concrete action (`regenerate_meal`, `change_meal_type`, etc.)
  - Parameters:
    - e.g. `{ makeHealthier: true, smallerPortion: true }`
    - e.g. `{ ingredientToRemove: "mayonnaise", ingredientToAdd: "greek yogurt" }`
    - e.g. `{ preferMealType: "drinkable" }`

The Review Agent must **NOT** choose specific new recipes; that is the responsibility of the plan engine / Coach Agent with deterministic filtering.

---

## 7. Plan Actions Endpoint (no separate orchestrator)

- Endpoint: `POST /plans/:weeklyPlanId/actions` (implemented in `PlansService`).
- Flow:
  1. Load `user`, `user_profile`, and current plan.
  2. Build `ReviewAgentInput` (compact plan summary) and call Review Agent → validated `ReviewInstruction` (Zod).
  3. `PlansService` applies the instruction directly:
     - `regenerate_meal` / `regenerate_day` / `regenerate_week`: deterministic selection (with optional agent if available).
     - `swap_ingredient` / `remove_ingredient` / add-only (via swap with only `ingredientToAdd`): clone recipe with ingredient changes using UUIDs.
     - `avoid_ingredient_future`: set strong negative score in `user_ingredient_score`.
     - `change_meal_type`: replace with solid/drinkable candidates respecting diet/allergy/budget/difficulty.
     - `adjust_portion`: small multiplier change.
  4. Recompute aggregates and rebuild shopping list; return updated plan.

---

## 8. Meal Type Handling (Solid vs Drinkable)

### 8.1. Data model

Ensure `recipes.meal_type` is present and used in selects.

Values:

- `'solid'`
- `'drinkable'`

### 8.2. Seed data

Add seeds for drinkable recipes, particularly:

- Breakfast shakes
- Protein smoothies
- Simple oat/banana shakes

Respect:

- Diet type (Halal, Vegan, etc.)
- Allergies (e.g., dairy-free options)

### 8.3. `change_meal_type` logic

When `ReviewInstruction.action === 'change_meal_type'`:

- Use `preferMealType` to filter candidates.
- Keep the same meal slot and day.
- Respect all constraints (diet, allergies, difficulty, budget heuristics).
- Replace the current recipe with the new one and recompute macros/cost.

---

## 9. LLM Provider Toggle (Local vs OpenAI)

### 9.1. Environment variables

Add configuration like:

```env
LLM_PROVIDER=local   # or: openai

LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL_REVIEW=llama3
LLM_MODEL_COACH=llama3

OPENAI_API_KEY=your-key-here
OPENAI_MODEL_REVIEW=gpt-5.1-mini
OPENAI_MODEL_COACH=gpt-5.1-mini
```

### 9.2. Client factory

In `AgentsService`, implement a small factory to choose the client and model name based on `LLM_PROVIDER` and whether we are calling Review vs Coach.

- For `local`:
  - Use `baseURL = LLM_BASE_URL` and some dummy API key if not required.
- For `openai`:
  - Use official OpenAI client with `OPENAI_API_KEY` and `OPENAI_MODEL_*` values.

Always set `response_format: { type: 'json_object' }` and then validate with Zod.

---

## 10. Testing & Quality Expectations

When adding or modifying backend code:

- Add **unit tests** for:
  - Plan generation logic (with LLM disabled).
  - Candidate selection & ranking.
  - Ingredient score application.
- Add **integration tests** or e2e tests for:
  - `/plan/generate-week` flow.
  - `/plans/:id/actions` for common actions (regenerate_meal, change_meal_type, avoid_ingredient_future).
- Ensure tests pass with **LLM calls mocked** (do not rely on live AI in tests).
- Keep logging structured and avoid logging sensitive data.

---

## 11. Style & Conventions for Generated Code

- Follow NestJS conventions:
  - Dependency Injection via constructors.
  - `@Injectable()` services.
  - `@Controller()` with route decorators.
  - DTOs in `/dto` folders.
- For new code:
  - Prefer **small, focused methods**.
  - Avoid mixing controller logic with domain logic; keep domain logic in services/orchestrators.
- For TypeScript:
  - Always type inputs/outputs explicitly.
  - Avoid `any` unless absolutely necessary (and then type-narrow quickly).

---

## 12. What the Code Generator MUST NOT Do

- Do NOT remove or rewrite core business rules without explicit instruction.
- Do NOT move logic arbitrarily between modules.
- Do NOT bypass Zod validation for LLM outputs.
- Do NOT introduce new external dependencies without clear justification.
- Do NOT let LLM invent recipes, macros, or prices in code paths.

---

Use this file as the **single source of truth** for backend behaviour when generating or modifying backend code.
