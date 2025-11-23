# Current Progress – Backend V2

## What’s in place
- Agents use `@langchain/openai` via `ChatOpenAI` with `response_format: json_object`.
- Basic Review/Coach prompts exist with inline Zod schemas (minimal).
- Plan generation, shopping list aggregation, and preference signals (recipe/ingredient increment) are present with deterministic fallbacks.
- Seed data and migrations cover core tables (no meal_type column yet).

## Gaps vs. V2 spec
- Review Agent schema is still V1; no `ReviewInstruction` Zod or structured params; no `/plans/:weeklyPlanId/actions` endpoint or orchestrator handlers.
- No `meal_type` column/entities/seeds; cannot support drinkable vs solid recipes or change_meal_type action.
- Candidate ranking lacks ingredient-avoid penalties and budget heuristics; no explicit “avoid ingredient in future” endpoint that writes strong-negative scores.
- LLM provider toggle missing (`LLM_PROVIDER` with local vs OpenAI client factory); envs are single-path and not split per provider.
- LLM outputs aren’t fully validated against V2 schemas; no deterministic fallback paths around invalid agent outputs in update flows.
- Tests cover selection basics, but no unit/e2e coverage for V2 flows (plan actions, budget-aware ranking, meal_type handling, avoid ingredient).

## Near-term goals
1) Implement `ReviewInstruction` schema + Zod, update Review Agent prompt, and add `/plans/:weeklyPlanId/actions` with a PlanUpdateOrchestrator covering regenerate/swap/remove/avoid/change_meal_type/adjust_portion.
2) Add `meal_type` column migration/entity updates and seed drinkable recipes; extend candidate search and orchestrator change-meal-type handler.
3) Extend candidate ranking with ingredient-score penalties and simple budget heuristics; add endpoint/service logic for explicit “avoid ingredient in future”.
4) Add LLM provider factory + envs for `local|openai` with JSON response enforcement and validation + fallbacks.
5) Backfill unit/e2e tests for plan generation, candidate ranking, and plan actions with mocked LLMs.
