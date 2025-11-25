# Unfinished items

## Backend

We have to make sure plans are better designed; better budgets; better goal requirements; agent is actually thinking smartly about these.

## Frontend

Recipe: recipe detail still uses stub data; needs real recipe/ingredient/method data and a save endpoint to persist ingredient edits/add/remove and AI notes;
Swap dialog: show real macros/prices, hook “auto decide” to backend/LLM when ready.

# Suggestions for next changes : 

### Future Versions:
Cache recipe candidates by slot/diet/difficulty to speed swaps, with short TTL and cache-busting on recipe updates.
Add simple rate limiting or request shaping for LLM calls to avoid runaway retries.
Unit plan page (so when viewing history a plan can be inspected)
- Build “My recipes” tab: list user custom recipes (`is_custom`, `createdByUser`), allow creating from scratch, and optionally record `parent_recipe_id` to reference originals.
- Add recipe-detail “Save as my recipe” flow to call `/plans/save-custom-recipe` and surface saved customs in selection flows.
- Optional “LLM-first plan builder” mode: GPT drafts a full week with inline recipes; formatter normalizes ingredients/prices; persist as `systemdraft` with provenance while keeping the current candidate-based flow as fallback.
