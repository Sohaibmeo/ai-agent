# Unfinished items

## Backend

We have to make sure that wherever user types to say something like change this or that. it actually works as well. (Improved review agent)

## Next steps (recipes/plans with LLM)
- Add `is_searchable`, `source` (catalog|user|llm), and `price_estimated` to recipes (migration + entity). Default is_searchable=false; source=llm for generated recipes.

Add fix cost and calories to the newly created ingredients (0.4 gbo per 100g) 4p 4c 9f or something


## Flows that needs to be improved

Ok. Now its time to work on the review agent.

Review agent is responsible for making any changes in the plan.

There are 3 ways to make the change.

One is to the whole plan (User will do it by selecting multiple days and clicking the modify button which will give user a text area in which he can enter the changes he wants)

Second has two parts first is to click on the swap button and then choosing auto decide for me (We try and see if we can find another dish wil almost close to the same macros).

In the swap menu if user decides to auto swap and then to describe we generate that one

Lasly user can select on a recipe to see the recipe detail page and there he can type any change that will work to only that recipe as well

We can have the plan controller receive our api call

plan service will call the interpretor function or whatever and then pass that info to review agent who will have access to the day generator or a single recipe generator. and then the requested change will be made accordingly

# Suggestions for next changes : 

### Future Versions:
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

Or:
{
  "meta": {
    "request_id": "uuid-or-similar",
    "created_at": "2025-11-25T19:00:00Z",
    "locale": "en-GB",
    "timezone": "Europe/London",
    // agent behaviour knobs
    "llm_creativity_level": "medium",        // "low" | "medium" | "high"
    "explanations_level": "short",           // "none" | "short" | "detailed"
    "hard_constraint_policy": "reject_plan_if_violated" 
    // or "allow_small_violations_with_notes"
  },

  // --- USER PROFILE / CONTEXT ---
  "user_profile": {
    "name": "Muhammad Sohaib Meo",
    "age_years": 26,
    "sex": "male",
    "height_cm": 178,
    "weight_kg": 75,
    "body_fat_percent": null,                // optional
    "activity_level": "moderately_active",   // "sedentary" | "light" | "moderate" | "high" | "athlete"
    "work_pattern": "desk_job",              // "desk_job" | "mixed" | "manual" | "shift"
    "training_schedule": [
      {
        "day_of_week": "monday",
        "type": "strength",
        "focus": "upper",
        "time_window": "06:00-08:00",
        "intensity": "high"
      }
      // ... more days
    ],
    "sleep_pattern": {
      "usual_bed_time": "20:30",
      "usual_wake_time": "04:15"
    }
  },

  // --- GOALS ---
  "goals": {
    "goal_type": "cut",                       // "cut" | "recomp" | "bulk" | "maintain"
    "target_weight_kg": 70,
    "timeframe_weeks": 12,
    "preferred_weight_change_per_week_kg": -0.4,
    "priority_order": [
      "fat_loss",                             // #1
      "muscle_retention",                     // #2
      "performance",                          // #3
      "budget",                               // #4
      "variety"                               // #5
    ]
  },

  // --- NUTRITIONAL TARGETS ---
  "nutrition": {
    "daily": {
      "calories_target": 1650,
      "calories_tolerance_percent": 0.10,     // 10% either way
      "protein_target_g": 140,
      "protein_min_g": 130,
      "protein_max_g": 170,
      "fat_target_g": 45,
      "fat_min_g": 35,
      "fat_max_g": 60,
      "carbs_target_g": 150,
      "carbs_min_g": 100,
      "carbs_max_g": 200,

      "fibre_min_g": 20,
      "fibre_max_g": 40,
      "sugar_max_g": 40,
      "sat_fat_max_g": 20,
      "sodium_max_mg": 2000,

      // advanced / optional
      "protein_per_kg_min_g": 1.6,           // g per kg bodyweight
      "protein_per_kg_max_g": 2.5
    },
    "per_meal": {
      "per_meal_protein_min_g": 30,
      "per_meal_protein_pref_g": 45,
      "per_meal_protein_max_g": 70,
      "per_meal_cals_min": 400,
      "per_meal_cals_max": 900,

      // timing rules, e.g. pre/post-workout emphasis
      "pre_workout_meal": {
        "time_window_hours_before": 2,
        "carbs_emphasis": "medium",         // "low" | "medium" | "high"
        "fat_limit_g": 20
      },
      "post_workout_meal": {
        "time_window_hours_after": 2,
        "protein_min_g": 35,
        "fast_digesting_carbs_preferred": true
      }
    },
    // optional micronutrient floors/ceilings (used softly)
    "micronutrients": {
      "iron_min_mg": null,
      "calcium_min_mg": null,
      "vitamin_d_min_IU": null
    }
  },

  // --- DIET PREFERENCES & RESTRICTIONS ---
  "diet_rules": {
    "diet_type": "omnivore",                   // "omnivore" | "vegetarian" | "vegan" | ...
    "religious_rules": "halal",               // "none" | "halal" | "kosher"
    "avoid_pork": true,
    "avoid_alcohol": true,
    "avoid_gelatin_non_halal": true,

    "allergens": [                             // controlled vocabulary if possible
      // e.g. "gluten", "peanuts", ...
    ],
    "intolerances": [                          // non-life-threatening sensitivities
      // "lactose", "high_fodmap"
    ],

    "ingredient_blacklist": [
      // global “never use”
    ],
    "ingredient_whitelist": [
      "chicken breast",
      "rice",
      "oats",
      "eggs",
      "yogurt"
    ],

    "disliked_flavours": [
      // e.g. "very_spicy", "bitter", "strong_coriander"
    ],
    "preferred_flavours": [
      "savory",
      "mild_spice"
    ],
    "preferred_cuisines": [
      "indian",
      "mediterranean"
    ],
    "avoid_cuisines": [
      // e.g. "mexican"
    ],

    "caffeine_preferences": {
      "allow_caffeine": true,
      "latest_caffeine_time": "16:00"
    }
  },

  // --- MEAL PLAN STRUCTURE ---
  "meal_structure": {
    "days": 7,
    "meals_per_day": 2,
    "allow_snacks": false,
    "named_meals": [
      {
        "key": "breakfast",
        "time_window": "04:30-08:00",
        "required": true
      },
      {
        "key": "dinner",
        "time_window": "17:00-20:30",
        "required": true
      }
    ],

    "fixed_meals": {
      "breakfast": {
        "type": "shake",
        "description": "High-protein oat-banana whey shake",
        "min_protein_g": 60,
        "calorie_target": 600,
        "allow_variations": true,           // same structure, small tweaks allowed
        "variations_per_week_max": 3
      }
    },

    "meal_timing_rules": {
      "min_minutes_between_meals": 4 * 60,
      "latest_heavy_meal_time": "20:00"
    },

    // variety rules
    "variety_rules": {
      "variety_level": "medium",            // "low" | "medium" | "high"
      "allow_same_breakfast_every_day": true,
      "max_same_dinner_per_week": 3,
      "min_different_dinners_per_week": 3,
      "reuse_ingredients_across_days": true,
      "max_unique_ingredients_per_week": 20,
      "max_new_ingredients_per_week": 4
    }
  },

  // --- COOKING & KITCHEN CONSTRAINTS ---
  "cooking": {
    "cooking_skill_level": "intermediate",    // "novice" | "intermediate" | "advanced"
    "max_cooking_time_per_meal_minutes": 30,
    "max_total_cooking_time_per_day_minutes": 60,
    "can_meal_prep": true,
    "meal_prep_days": ["saturday", "sunday"],
    "max_days_to_store_cooked_food": 4,       // for leftovers in fridge
    "storage_options": {
      "has_fridge": true,
      "has_freezer": true,
      "has_microwave": true,
      "has_oven": true
    },
    "equipment_available": [
      "stovetop",
      "oven",
      "microwave",
      "air_fryer",
      "rice_cooker",
      "blender",
      "nonstick_pan",
      "baking_tray"
    ],
    "equipment_unavailable": [
      // e.g. "grill", "slow_cooker"
    ],
    "allowed_cooking_methods": [
      "boil",
      "bake",
      "air_fry",
      "stir_fry",
      "saute"
    ],
    "disallowed_cooking_methods": [
      "deep_fry"
    ]
  },

  // --- BUDGET & SHOPPING ---
  "budget_and_shopping": {
    "currency": "GBP",
    "weekly_budget": 45.0,
    "budget_flex_percent": 0.15,              // can exceed by 15% if necessary
    "cost_priority_level": "medium",          // "low" | "medium" | "high"
    "prefer_store_brands": true,
    "min_servings_per_shopping_item": 3,      // encourage bulk usage
    "shopping_frequency_per_week": 2,
    "shopping_days": ["saturday", "wednesday"],
    "preferred_shops": ["tesco", "asda"],
    "avoid_shops": [],
    "use_live_price_data": true,              // if your system supports this
    "round_portions_to_package_sizes": true   // e.g. don’t ask for 37g of something if pack is 500g
  },

  // --- LOCALISATION & UNITS ---
  "localisation": {
    "country": "UK",
    "city": "London",
    "season": "winter",                       // used for seasonal suggestions
    "unit_system": "metric",                  // "metric" | "imperial"
    "output_language": "en-GB",
    "measurement_preferences": {
      "use_grams_for_solids": true,
      "use_ml_for_liquids": true,
      "allow_household_measures": true,      // e.g. “1 cup”, “1 tbsp”
      "show_both_metric_and_household": true
    }
  },

  // --- HEALTH & MEDICAL FLAGS (SOFT CONSTRAINTS) ---
  "health": {
    "medical_conditions": [
      // e.g. "type_2_diabetes", "hypertension", ...
    ],
    "needs_low_glycemic_load": false,
    "needs_low_sodium": false,
    "needs_low_cholesterol": false,
    "doctor_approval_required_for_major_changes": true
  },

  // --- VARIETY & EXPLORATION SETTINGS ---
  "exploration_settings": {
    "introduce_new_recipe_probability": 0.3,   // 0–1, per meal
    "limit_repetitions_in_a_row": 2,          // e.g. same dinner max 2 days running
    "allow_experimental_flavours": false
  },

  // --- RECIPE OUTPUT FORMAT CONSTRAINTS ---
  "recipe_output": {
    "include_macros_per_meal": true,
    "include_macros_per_ingredient": true,
    "include_calories": true,
    "include_step_timings": true,
    "include_difficulty_rating": true,
    "include_cost_estimate": true,
    "include_leftover_instructions": true,    // how to store & reuse
    "include_allergen_flags": true,
    "include_substitutions": true,            // propose swaps for common allergens/blacklist
    "max_instructions_steps": 10,
    "style": "concise",                       // "concise" | "detailed" | "beginner_friendly"
    "tone": "neutral_professional"            // "neutral_professional" | "friendly" | "coaching"
  },

  // --- PLAN VALIDATION & ERROR HANDLING ---
  "validation_and_errors": {
    "on_hard_constraint_conflict": "explain_and_refuse", 
    // or "warn_and_suggest_adjustment"
    "on_budget_conflict": "suggest_cheaper_alternatives",
    "on_missing_ingredient_data": "fallback_to_generic_food_item",
    "max_allowed_constraint_violations": 0,
    "must_never_violate": [
      "diet_rules.religious_rules",
      "diet_rules.allergens",
      "diet_rules.ingredient_blacklist"
    ]
  },

  // --- DEVELOPER / DEBUG OPTIONS (for you while building the agent) ---
  "debug": {
    "include_rationale_in_output": true,      // show why the agent chose meals
    "log_constraint_checks": true,
    "max_internal_search_iterations": 8
  }
}
