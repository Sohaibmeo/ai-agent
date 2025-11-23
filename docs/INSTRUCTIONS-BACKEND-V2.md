# INSTRUCTIONS-BACKEND-V2.md
## AI-Powered Meal Planning Platform – Backend V2 Plan

This document defines the **Backend V2 scope and design** for the AI-powered meal planning system.

V2 focuses on:

- Strengthening the **domain engine** (plans, preferences, costs)
- Designing and integrating a **proper Review Agent**
- Introducing **meal type handling** (solid vs drinkable) via seeded recipes
- Adding **ingredient score logic** via explicit “avoid ingredient” actions
- Supporting **local LLM and OpenAI** via environment configuration
- Keeping swaps and most edits **deterministic and explainable**

V2 is still **local-first**, with **optional OpenAI** toggle and **no auth**.

---

## 1. High-Level Goals for Backend V2

1. **Make the Review Agent truly useful**:
   - Interpret user feedback (lighter, cheaper, higher protein, drinkable).
   - Produce structured instructions for the orchestrator + Coach Agent.
   - Support ingredient-level operations (remove/avoid/replace).

2. **Keep swaps deterministic**:
   - Swapping meals uses a **sorted candidate list** from the backend.
   - Review Agent is _not_ responsible for picking recipes, only instructions.

3. **Introduce meal types**:
   - Recipes can be **solid** or **drinkable**.
   - Review Agent & backend support “change this to a drinkable option”.
   - Seed drink recipes for breakfast/snacks (e.g., shakes, smoothies).

4. **Improve preference learning**:
   - Implement ingredient score changes for **explicit avoid actions**.
   - Keep behaviour predictable and easy to reason about.

5. **Support multiple model providers**:
   - Local LLM by default.
   - Optional OpenAI `gpt-5-mini` via env variables.

---

## 2. Review Agent V2 Design

### 2.1. New `ReviewInstruction` schema

Replace the simple schema with a richer one that captures:

```ts
// src/agents/schemas/review-instruction.schema.ts

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
  // For ingredient operations
  ingredientToRemove?: string;
  ingredientToAdd?: string;
  applyToWholeWeek?: boolean;

  // Nutrition / cost tuning
  makeHealthier?: boolean;
  makeCheaper?: boolean;
  makeHigherProtein?: boolean;
  keepCaloriesSimilar?: boolean;

  // Portion changes
  smallerPortion?: boolean;
  largerPortion?: boolean;

  // Meal type: solid vs drinkable
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
  notes?: string; // explanation / reasoning for logging
}
```

Implement a corresponding **Zod schema** and use it to validate the LLM output.

### 2.2. Review Agent responsibilities (V2 scope)

The Review Agent should:

- Map **user-facing actions + text reasons** into structured instructions:
  - “This lunch is too heavy” → `targetLevel: "meal", action: "regenerate_meal", params: { smallerPortion: true, makeHealthier: true }`
  - “Make this whole day cheaper” → `targetLevel: "day", action: "regenerate_day", params: { makeCheaper: true }`
  - “Remove mayo and replace with yogurt” → `action: "swap_ingredient", params: { ingredientToRemove: "mayonnaise", ingredientToAdd: "greek yogurt" }`
  - “Turn this into a smoothie instead” → `action: "change_meal_type", params: { preferMealType: "drinkable" }`

- Interpret **UI action types** and **optional free-text reason** into coherent `ReviewInstruction`.

It should **not** pick specific recipes or directly modify plans.

---

## 3. Review Agent API

### 3.1. Input payload

The Review Agent service will be called from the orchestrator as:

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
  reasonText?: string;   // optional “why” text from the user
  profileSnippet: {
    goal: string;
    dietType: string;
    weeklyBudgetGbp?: number | null;
  };
  currentPlanSummary: any; // lightweight projection (day -> meals)
}
```

The orchestrator should pass a **compact plan summary**, not full DB entities (to keep tokens low).

### 3.2. Output

The Review Agent responds with `ReviewInstruction` JSON, validated by Zod and returned to the orchestrator.

---

## 4. Orchestrator: `/plans/actions` flow

### 4.1. New endpoint

Add an endpoint such as:

```http
POST /plans/:weeklyPlanId/actions
```

Body:

```json
{
  "actionContext": {
    "type": "regenerate_meal",
    "planDayId": "day-uuid",
    "planMealId": "meal-uuid"
  },
  "reasonText": "Make this lighter and cheaper"
}
```

Internal flow:

1. Load **user**, **profile**, and **current plan**.
2. Build `ReviewAgentInput` with `actionContext`, `reasonText`, `profileSnippet`, and `currentPlanSummary`.
3. Call `reviewAgent.reviewAction(input)` → get `ReviewInstruction`.
4. Pass `ReviewInstruction` to a **PlanUpdateOrchestrator**.

### 4.2. PlanUpdateOrchestrator

Create a small orchestration module, e.g.:

```ts
class PlanUpdateOrchestrator {
  async handleInstruction(
    userId: string,
    weeklyPlanId: string,
    instruction: ReviewInstruction,
  ): Promise<WeeklyPlan> {
    switch (instruction.action) {
      case 'regenerate_meal':
        return this.regenerateMeal(...);
      case 'regenerate_day':
        return this.regenerateDay(...);
      case 'swap_ingredient':
        return this.swapIngredient(...);
      case 'remove_ingredient':
        return this.removeIngredient(...);
      case 'avoid_ingredient_future':
        return this.avoidIngredientFuture(...);
      case 'change_meal_type':
        return this.changeMealType(...);
      case 'adjust_portion':
        return this.adjustPortion(...);
      default:
        // For unknown actions, just return the unchanged plan
        return this.getPlan(weeklyPlanId);
    }
  }
}
```

In V2, **most of these should call deterministic logic**. Where needed, they may call **Coach Agent** to regenerate parts of the plan, but recipe selection and constraints remain within predictable boundaries.

---

## 5. Meal Type Handling (Solid vs Drinkable)

### 5.1. Data model change

Update `recipes` table to include a `meal_type` column:

```sql
ALTER TABLE recipes
ADD COLUMN meal_type VARCHAR(20) NOT NULL DEFAULT 'solid';
```

Allow values:

- `'solid'`
- `'drinkable'`

In TypeORM entity:

```ts
@Column({ type: 'varchar', length: 20, default: 'solid' })
meal_type: 'solid' | 'drinkable';
```

### 5.2. Seeding drinkable recipes

Add seed data for **drinkable recipes**, especially for breakfast/snack slots:

- Protein shakes (various flavours).
- Smoothies (fruit/veg, with optional protein).
- Simple blended oat shakes.

Ensure they respect:
- Halal constraints (no alcohol, no haram ingredients).
- Allergies (e.g., dairy-free variants).

### 5.3. Change meal type action

When Review Agent outputs:

```json
{
  "action": "change_meal_type",
  "targetLevel": "meal",
  "params": { "preferMealType": "drinkable" }
}
```

Backend logic:

1. Identify the current recipe’s meal slot (e.g., breakfast).
2. Fetch candidate recipes with:
   - Same meal slot.
   - `meal_type = 'drinkable'`.
   - Matching diet type + allergens + difficulty.
3. Rank candidates (recipe score, cost, macros).
4. Replace the meal with a selected drinkable recipe.
5. Recompute macros/cost for the day and week.
6. Rebuild shopping list for affected plan.

---

## 6. Ingredient Score Logic (Preference Learning)

### 6.1. V2 behaviour rules

You chose **Option C**: score only on explicit “avoid ingredient” UI actions.

Rules:

- When user explicitly clicks:
  - “Avoid this ingredient in future”
- Then:
  - Update `UserIngredientScore` to mark it as **strongly negative**.

### 6.2. Data model usage

Use existing `user_ingredient_score` table to store per-user signals, e.g.:

```sql
user_ingredient_score (
  id,
  user_id,
  ingredient_id,
  score INT,  -- negative for avoided ingredients
  created_at,
  updated_at
);
```

### 6.3. Applying ingredient scores in candidate selection

In `RecipesService.findCandidatesForUser(...)`:

1. Join recipe ingredients with `user_ingredient_score`.
2. Derive a small penalty for recipes that include strongly avoided ingredients.
3. Do **not** treat this like an allergy (no hard filtering), unless user explicitly marks it as “never use” at profile level.
4. Sort candidates by:
   - Recipe score (likes/dislikes)
   - Ingredient penalty
   - Difficulty + diet compliance

This keeps behaviour predictable but gently biases away from avoided ingredients.

---

## 7. Budget Awareness (Good Enough for V2)

### 7.1. Simple per-week budget check

In V2, keep logic simple but enforce some awareness:

- Input: `weekly_budget_gbp` from profile / plan settings.
- For each meal, when selecting recipes:
  - Compute rough daily budget: `dailyBudget = weeklyBudget / 7`.
  - Avoid recipes that push a day too far over budget when alternatives exist.

### 7.2. Implementation idea

When selecting candidates for a meal, compute:

- `estimatedCostSoFarForDay` (sum of previous selected meals).
- If `estimatedCostSoFarForDay + candidateMealCost` is:
  - Too far above daily budget (`> dailyBudget * 1.3`), deprioritise that candidate.
  - But never fully eliminate all options (fallback always available).

No need for complex optimization; just ensure “good enough” behaviour.

---

## 8. Local vs OpenAI LLM Configuration

### 8.1. Environment variables

Add env controls:

```env
LLM_PROVIDER=local   # or: openai

LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL_REVIEW=llama3
LLM_MODEL_COACH=llama3

OPENAI_API_KEY=your-key-here
OPENAI_MODEL_REVIEW=gpt-5.1-mini
OPENAI_MODEL_COACH=gpt-5.1-mini
```

### 8.2. Client configuration

In `AgentsService`, configure a small factory:

```ts
function createLlmClientFor(provider: 'local' | 'openai') {
  if (provider === 'openai') {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return new OpenAI({
    baseURL: process.env.LLM_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY ?? 'dummy',
  });
}
```

Then inside `callModel(...)`, pick model name + client based on `LLM_PROVIDER` and action type (review vs coach).

---

## 9. Backend V2 Task Checklist

### 9.1. Review Agent & Orchestrator

- [ ] Implement new `ReviewInstruction` Zod schema.
- [ ] Update `reviewAction` to use new schema + prompt.
- [ ] Add `POST /plans/:weeklyPlanId/actions` endpoint.
- [ ] Implement `PlanUpdateOrchestrator` with handlers:
  - [ ] `regenerate_meal`
  - [ ] `regenerate_day`
  - [ ] `swap_ingredient`
  - [ ] `remove_ingredient`
  - [ ] `avoid_ingredient_future`
  - [ ] `change_meal_type`
  - [ ] `adjust_portion` (simple smaller/larger logic).
- [ ] Wire Review Agent into orchestrator.

### 9.2. Meal Type

- [ ] Add `meal_type` column to recipes.
- [ ] Update seed with drinkable recipes.
- [ ] Ensure `findCandidatesForUser` can filter by `meal_type` when needed.
- [ ] Implement `changeMealType` handler in orchestrator.

### 9.3. Ingredient Scores

- [ ] Implement service method to set `UserIngredientScore` for “avoid ingredient”.
- [ ] Expose an endpoint for frontend to call when user marks “avoid ingredient in future”.
- [ ] Modify candidate ranking to apply ingredient penalties.

### 9.4. Budget Logic

- [ ] Add simple daily budget estimation from weekly budget.
- [ ] Integrate cost-awareness into candidate ranking / selection.

### 9.5. LLM Provider Toggle

- [ ] Add `LLM_PROVIDER` env handling.
- [ ] Support both local and OpenAI clients.
- [ ] Test both paths with simple review/coach calls.

---

This completes the **Backend V2 instruction spec**. Use this as the blueprint for incremental refactors and feature additions without breaking the existing V1 behaviour.
