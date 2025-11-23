# Current Progress – Backend V2

## Current state
- Plan actions handled in PlansService with `ReviewInstruction` (UUIDs enforced): regenerate week/day/meal, change_meal_type, swap/remove/add (via swap), avoid_ingredient_future, adjust_portion; aggregates + shopping list recomputed.
- LLM provider toggle, Zod validation, and logging (provider/model/latency); choose-ingredient endpoint validates IDs against provided candidates.
- Meal type migration applied; drinkable seeds present; candidate queries filter by meal_type.
- Candidate ranking includes budget heuristics and ingredient-avoid penalties; avoid endpoint persists strong negatives.
- Ingredient resolver supports exact + fuzzy (pg_trgm) with fallback; pg_trgm migration applied and startup warns if missing.
- Tests: `npm test` all green; e2e plan actions and resolver passing.

## Open items / next steps
- Add targeted tests: change_meal_type outcomes, avoid-ingredient penalty effects in ranking.
- Optional: integrate choose-ingredient into action flow when multiple candidates remain (validated IDs) or keep UI-driven.
- Enhance logging/metrics: structured counters for agent success/failure/fallback, per-action audit.
- Optional: richer budget heuristics (day-level tracking) and variety constraints.
