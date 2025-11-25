# Unfinished items

## Backend

We have to make sure plans are better designed; better budgets; better goal requirements; agent is actually thinking smartly about these. (Improved coach agent)
We have to make sure that wherever user types to say something like change this or that. it actually works as well. (Improved review agent)

# Suggestions for next changes : 

### Future Versions:
Make sure throughout our app the data is all real and getting fetched from backend basically
Cache recipe candidates by slot/diet/difficulty to speed swaps, with short TTL and cache-busting on recipe updates.
Add simple rate limiting or request shaping for LLM calls to avoid runaway retries.
Unit plan page (so when viewing history a plan can be inspected)
- Build “My recipes” tab: list user custom recipes (`is_custom`, `createdByUser`), allow creating from scratch, and optionally record `parent_recipe_id` to reference originals.
- Add recipe-detail “Save as my recipe” flow to call `/plans/save-custom-recipe` and surface saved customs in selection flows.
- Optional “LLM-first plan builder” mode: GPT drafts a full week with inline recipes; formatter normalizes ingredients/prices; persist as `systemdraft` with provenance while keeping the current candidate-based flow as fallback.
finish hooking swap “auto decide” to a real backend/LLM pick (currently heuristic) and implement the remaining plan advanced settings (history/advanced flow is mostly done).
The app still relies on DEMO_USER_ID for the current session; multi-user switching isn’t wired in the UI.
## Future total constraints list :
{
  "days": 7,
  "goal_type": "cut",
  "meals_per_day": 2,
  "fixed_meals": { "breakfast": "shake" },
  "allow_snacks": false,
  "daily_calories_target": 1650,
  "daily_calories_tolerance_percent": 0.1,
  "protein_grams_target": 140,
  "protein_min_grams": 130,
  "per_meal_protein_min": 50,
  "shake_protein_min": 60,
  "fibre_grams_min": 20,
  "diet_type": "omnivore",
  "religious_rules": "halal",
  "allergens": [],
  "ingredient_blacklist": [],
  "ingredient_whitelist": ["chicken breast", "rice", "oats", "eggs", "yogurt"],
  "cooking_skill_level": "intermediate",
  "max_cooking_time_per_meal_minutes": 30,
  "can_meal_prep": true,
  "allow_same_breakfast_every_day": true,
  "variety_level": "medium",
  "reuse_ingredients_across_days": true,
  "max_unique_ingredients_per_week": 20
}
