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
1) Add stronger action handlers for swap/remove ingredient (done; basic custom-clone approach).
2) Add logging/metrics around agent usage to differentiate LLM vs fallback (partial: logging added in AgentsService).
3) Backfill more tests (change_meal_type, avoid ingredient, ranking budgets) and run full suite regularly.
4) Optional: persist custom recipe creation provenance and ingredient additions for swap to avoid placeholder IDs; tighten validation.
5) Postman/testing guide for LLM vs deterministic comparisons (document flow).
