# Unfinished items

## Backend

Budget/variety heuristics: richer day-level budget handling and variety constraints

## Frontend

Recipe: recipe detail still uses stub data; needs real recipe/ingredient/method data and a save endpoint to persist ingredient edits/add/remove and AI notes;
Swap dialog: show real macros/prices, hook “auto decide” to backend/LLM when ready.
Plans page: advanced settings flow is not implemented.
Groceries: week selector/history not implemented; responsive tweaks still pending.

# Suggestions for next changes : 

### Future Versions:
Cache recipe candidates by slot/diet/difficulty to speed swaps, with short TTL and cache-busting on recipe updates.
Add simple rate limiting or request shaping for LLM calls to avoid runaway retries.
Unit plan page (so when viewing history a plan can be inspected)