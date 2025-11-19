import { pool } from '../index.js';
import { UserPreferences, UserProfile } from '../../types.js';

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const result = await pool.query(
    `SELECT user_id, age, height_cm, weight_kg, activity_level, dietary_requirement,
            recipe_difficulty, portion_mode, weekly_budget_gbp,
            meal_breakfast, meal_snack, meal_lunch, meal_dinner
     FROM user_profile WHERE user_id = $1`,
    [userId],
  );

  if (!result.rows.length) {
    return null;
  }

  const row = result.rows[0];
  return {
    userId: row.user_id,
    age: row.age,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    activityLevel: row.activity_level,
    dietaryRequirement: row.dietary_requirement,
    recipeDifficulty: row.recipe_difficulty,
    portionMode: row.portion_mode,
    weeklyBudgetGbp: row.weekly_budget_gbp,
    mealBreakfast: row.meal_breakfast,
    mealSnack: row.meal_snack,
    mealLunch: row.meal_lunch,
    mealDinner: row.meal_dinner,
  };
}

export async function upsertUserProfile(profile: UserProfile) {
  await pool.query(
    `INSERT INTO user_profile (
      user_id, age, height_cm, weight_kg, activity_level, dietary_requirement,
      recipe_difficulty, portion_mode, weekly_budget_gbp,
      meal_breakfast, meal_snack, meal_lunch, meal_dinner
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (user_id) DO UPDATE
      SET age = EXCLUDED.age,
          height_cm = EXCLUDED.height_cm,
          weight_kg = EXCLUDED.weight_kg,
          activity_level = EXCLUDED.activity_level,
          dietary_requirement = EXCLUDED.dietary_requirement,
          recipe_difficulty = EXCLUDED.recipe_difficulty,
          portion_mode = EXCLUDED.portion_mode,
          weekly_budget_gbp = EXCLUDED.weekly_budget_gbp,
          meal_breakfast = EXCLUDED.meal_breakfast,
          meal_snack = EXCLUDED.meal_snack,
          meal_lunch = EXCLUDED.meal_lunch,
          meal_dinner = EXCLUDED.meal_dinner,
          updated_at = NOW()`,
    [
      profile.userId,
      profile.age,
      profile.heightCm,
      profile.weightKg,
      profile.activityLevel,
      profile.dietaryRequirement,
      profile.recipeDifficulty,
      profile.portionMode,
      profile.weeklyBudgetGbp,
      profile.mealBreakfast,
      profile.mealSnack,
      profile.mealLunch,
      profile.mealDinner,
    ],
  );
}

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const result = await pool.query(
    `SELECT user_id, ingredients_preferred, ingredients_avoid, must_have_ingredients,
            cuisines_liked, cuisines_disliked, recipes_preferred
     FROM user_preferences WHERE user_id = $1`,
    [userId],
  );

  if (!result.rows.length) {
    return null;
  }

  const row = result.rows[0];
  return {
    userId: row.user_id,
    ingredientsPreferred: row.ingredients_preferred ?? [],
    ingredientsAvoid: row.ingredients_avoid ?? [],
    mustHaveIngredients: row.must_have_ingredients ?? [],
    cuisinesLiked: row.cuisines_liked ?? [],
    cuisinesDisliked: row.cuisines_disliked ?? [],
    recipesPreferred: row.recipes_preferred ?? [],
  };
}

export async function upsertUserPreferences(preferences: UserPreferences) {
  await pool.query(
    `INSERT INTO user_preferences (
      user_id, ingredients_preferred, ingredients_avoid, must_have_ingredients,
      cuisines_liked, cuisines_disliked, recipes_preferred
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (user_id) DO UPDATE SET
      ingredients_preferred = EXCLUDED.ingredients_preferred,
      ingredients_avoid = EXCLUDED.ingredients_avoid,
      must_have_ingredients = EXCLUDED.must_have_ingredients,
      cuisines_liked = EXCLUDED.cuisines_liked,
      cuisines_disliked = EXCLUDED.cuisines_disliked,
      recipes_preferred = EXCLUDED.recipes_preferred,
      updated_at = NOW()`,
    [
      preferences.userId,
      preferences.ingredientsPreferred,
      preferences.ingredientsAvoid,
      preferences.mustHaveIngredients,
      preferences.cuisinesLiked,
      preferences.cuisinesDisliked,
      preferences.recipesPreferred,
    ],
  );
}
