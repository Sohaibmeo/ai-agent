# Postman Guide – Backend Plan Actions and LLM vs Fallback

## Prereqs
- Backend running with `.env` loaded (`npm run start:dev`).
- DB migrated (`npm run typeorm migration:run`) and seeded (`psql < scripts/seed_full.sql` then `psql < scripts/seed_recipe_ingredients.sql`).
- Seeded user: `11111111-1111-1111-1111-111111111111` (adjust if changed).

## Key environment toggles
- `LLM_PROVIDER=local` (default) or `openai`
- Local: `LLM_BASE_URL=http://localhost:11434/v1`, `LLM_API_KEY=dummy`
- OpenAI: `OPENAI_API_KEY=<key>`, optional `OPENAI_BASE_URL`

Watch logs for agent lines: `[review] model=... provider=... latency_ms=...` or errors for fallback.

## Requests
1) Generate deterministic plan  
   - POST `/plans/generate`  
   - Body: `{ "userId": "<user>" }`

2) Generate with Coach Agent (LLM) + fallback  
   - POST `/plans/generate`  
   - Body: `{ "userId": "<user>", "useAgent": true }`  
   - Success logs `coach` call; if LLM fails, plan still returns via deterministic selection.

3) Get active plan  
   - GET `/plans/active/<userId>`

4) Plan actions via Review Agent  
   - POST `/plans/<planId>/actions`  
   - Bodies:  
     - Regenerate meal: `{ "userId": "<user>", "actionContext": { "type": "regenerate_meal", "planMealId": "<mealId>" }, "reasonText": "lighter" }`  
     - Change to drinkable: `{ "userId": "<user>", "actionContext": { "type": "change_meal_type", "planMealId": "<mealId>" }, "reasonText": "make it a shake" }`  
     - Swap ingredient: `{ "userId": "<user>", "actionContext": { "type": "swap_ingredient", "planMealId": "<mealId>" }, "reasonText": "swap mayo for yogurt", "params": { "ingredientToRemove": "<ingredient-uuid>", "ingredientToAdd": "<ingredient-uuid>" } }`  
   - Response returns updated plan; logs show review agent call.

5) Avoid an ingredient for future ranking  
   - POST `/preferences/avoid-ingredient`  
   - Body: `{ "userId": "<user>", "ingredientId": "<ingredient-uuid>" }`

6) Resolve ingredient from free text (to get UUID before swap)  
   - POST `/ingredients/resolve`  
   - Body: `{ "query": "mayonnaise", "createIfMissing": true, "limit": 5, "minScore": 0.35 }`  
   - Response includes `matches` (with scores) and `resolved` when confident; use `resolved.id` in swap/remove params.

7) Optional: let LLM pick among known ingredients  
   - POST `/agents/choose-ingredient`  
   - Body: `{ "reasonText": "swap mayo for ketchup", "candidates": [ { "id": "<ing-id-1>", "name": "Mayonnaise" }, { "id": "<ing-id-2>", "name": "Ketchup" } ] }`  
   - Returns `{ ingredient_id }` that must be one of the provided candidates; validate before using in swap.

6) Fetch candidates (inspect ranking)  
   - GET `/recipes/candidates?userId=<user>&mealSlot=breakfast`

## Compare LLM vs fallback
- Run step 2 with `LLM_PROVIDER=local` (or `openai`) and again with provider mis-set to force failure; compare meal selections and logs (coach success vs fallback warning).  
- Actions endpoint always calls Review Agent; invalid LLM output will throw—watch error logs.
