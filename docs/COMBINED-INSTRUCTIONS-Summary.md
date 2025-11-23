# Combined Instructions Summary

## Purpose & Product
- AI-assisted 7-day meal planning for UK users (students/young pros).
- Goals: body composition, diet types, 14 allergens, budget, easy cooking; shopping list derived from final plan.
- LLM selects from existing recipes; backend computes macros/cost (LLM never invents recipes/macros/prices).

## Stack & Architecture
- Backend: NestJS/TS + Postgres + TypeORM; modules for Users, Recipes, Plans, ShoppingList, Agents, Preferences.
- Frontend (later): React/TS dashboard (Profile, Plans, Groceries tabs).
- LLM: local OpenAI-compatible endpoint (env-driven models); Zod validation; structured logging.

## Current Progress
- Backend implemented with migrations/seeds; plan generation (heuristic + optional Coach agent), swaps, custom recipes with macro/cost recompute, activation with archive of prior active.
- Shopping list aggregation with pantry flags and price overrides.
- Preference tracking (liked/disliked ingredients/meals) and denormalized scores for ranking candidates.
- Agents endpoints (Review/Coach/Explain/Nutrition) wired to local LLM with logging and validation stubs; `useAgent` toggle in plan generation.
- Tests: unit + e2e (plan flow, agent generation/review mocked) passing; structured logging in services.

## Remaining Work
- Frontend: React/TS UI per instruction-04 (tabs, swap/modify modals, budget/pantry/price override UI, surfaces for agent outputs/preferences).
- Review agent in flows: interpret swap/modify intents and apply swaps; log agent vs. fallback in responses.
- Preference maturity: more signals (kept/repeats/custom removals), decay/normalization, use scores in ranking/prompts (soft boosts).
- Plan lifecycle polish: history/multi-week, refine status transitions; clearer active plan/list errors; budget/variety heuristic tuning.
- Shopping list edge cases: more aggregation tests with overrides/pantry; clearer errors.
- LLM usage: enforce local-first config (LLM_BASE_URL/LLM_MODEL_* envs), expose health/ping, keep prompts compact (truncate plans, slim candidates), set tight max_tokens, always validate with Zod, log sanitized raw outputs on failure, and add graceful fallbacks. Plan for future OpenAI cloud switch + caching/latency monitoring.
- Data/seed hygiene: enrich recipes/ingredients for diet/allergen/budget variety; align seeds with schema.
- Ops/tests: expand integration/e2e for agent swap flows and filters/ranking; add lint/prettier/CI hooks.
- Architecture alignment: separate plan engine/orchestrator layering (PlanEngineService, AgentOrchestrator/LangChain chains) from controllers/services; currently logic lives in PlansService/AgentsService.
- LangChain pipelines: implement chains per instruction (Review/Coach) instead of direct OpenAI client.
- Data model coverage: optional plan_meal_ingredients if per-meal ingredient breakdown is needed (currently omitted). Plan fetches can load recipe ingredients lazily (on demand via recipe detail), not eager-loaded by default. Confirm seed/data hygiene matches schema (UUIDs, constraints), and consider adding richer recipe/ingredient variety per instruction-05.
- Agents orchestration gaps (from instruction-06): add Review-driven swap/modify flow (actionContext → Review → Coach update), Coach update mode using currentPlan + reviewInstruction, and a dedicated orchestrator layer rather than mixing logic in PlansService/AgentsService. Frontend hooks to trigger Review/Coach paths still needed.
- Flows (instruction-07) improvements: first critically assess gaps/UX before implementation, then add full agent-driven swap/modify (review + coach update) for richer intents; build modify UI flow (load recipe details, ingredient editor, save custom recipe, update plan); add plan history/multi-week lifecycle; build shopping list UX (pantry toggles, price override UI, budget feedback). Keep edits smooth and transparent about agent vs. fallback behaviour.
- Future extensibility (instruction-09): deepen preference learning (cuisines, disliked textures, repeats), add preference/explanation/nutrition advisor agents, consider workout integration for macro tweaks, support multi-week planning/rotations, broaden diet/localization, and layer auth/privacy/compliance later.

## Complete Frontend Plan (instruction-04)
- Layout: Dashboard with sidebar tabs (Profile, Plans, Groceries) and main content.
- Profile tab: collect basic info, goal, diet type, allergies, meal schedule toggles, difficulty cap, optional weekly budget; load via GET profile, save via PUT profile.
- Plans tab: “Generate New Week” action and current plan summary (week start, status, budget/macros). 7-day grid with meal cards showing recipe, portion, calories/protein (optional), cost, and actions Swap/Modify; optional plan history list.
- Swap flow: open candidates modal from backend `/recipes/candidates`, user picks one, POST `/plan/set-meal-recipe`, refresh plan.
- Modify flow: fetch recipe detail, ingredient editor (add/remove/update qty), POST `/recipes/custom-from-existing`, backend recalculates macros/cost and updates the plan meal.
- Activate plan: POST to activate/current, archive prior active, regenerate shopping list.
- Groceries tab: select plan (default active), grouped items with name/qty/cost, “I already have this” checkbox (pantry), “Update price” override form; budget summary showing estimated total vs weekly budget, updated after pantry/price changes.
