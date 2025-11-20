import pool from './db';

export async function getCandidateRecipes({
  mealSlot,
  dietType,
  allergyKeys,
  maxDifficulty
}: {
  mealSlot: string;
  dietType: string;
  allergyKeys: string[];
  maxDifficulty: string;
}) {
  // Query recipes matching meal slot, diet type, difficulty, and excluding allergens
  const result = await pool.query(`
    SELECT r.*
    FROM recipes r
    WHERE r.meal_slot = $1
      AND $2 = ANY(r.diet_tags)
      AND r.difficulty <= $3
      AND NOT EXISTS (
        SELECT 1 FROM recipe_ingredients ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = r.id
          AND i.allergen_keys && $4::text[]
      )
    LIMIT 7;
  `, [mealSlot, dietType, maxDifficulty, allergyKeys]);
  return result.rows;
}
