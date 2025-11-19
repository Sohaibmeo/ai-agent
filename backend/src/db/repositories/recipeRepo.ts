import { pool } from '../index.js';
import { RecipeRecord } from '../../types.js';

export interface RecipeIngredientDetail {
  recipeId: string;
  ingredientId: string | null;
  name: string;
  quantity: number;
  quantityUnit: string;
  unitPrice: number | null;
}

export interface RecipeWithIngredients extends RecipeRecord {
  ingredients: RecipeIngredientDetail[];
}

export async function listCatalogRecipes(userId: string): Promise<RecipeRecord[]> {
  const result = await pool.query(
    `SELECT id, name, meal_slot, difficulty, description,
            base_kcal, base_protein, base_carbs, base_fat, base_estimated_cost,
            is_custom, created_by_user_id
     FROM recipes
     WHERE is_custom = FALSE OR created_by_user_id = $1
     ORDER BY name ASC`,
    [userId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    mealSlot: row.meal_slot,
    difficulty: row.difficulty,
    description: row.description,
    baseKcal: row.base_kcal,
    baseProtein: row.base_protein,
    baseCarbs: row.base_carbs,
    baseFat: row.base_fat,
    baseEstimatedCost: row.base_estimated_cost,
    isCustom: row.is_custom,
    createdByUserId: row.created_by_user_id,
  }));
}

export async function createCustomRecipe(input: {
  userId: string;
  name: string;
  mealSlot: RecipeRecord['mealSlot'];
  difficulty: RecipeRecord['difficulty'];
  description?: string;
  baseKcal?: number;
  baseProtein?: number;
  baseCarbs?: number;
  baseFat?: number;
  baseEstimatedCost?: number;
  ingredients: Array<{ ingredientId: string; quantity: number; quantityUnit: string }>;
}) {
  const recipeInsert = await pool.query<{ id: string }>(
    `INSERT INTO recipes (
      id, name, meal_slot, difficulty, description,
      base_kcal, base_protein, base_carbs, base_fat, base_estimated_cost,
      is_custom, created_by_user_id
    ) VALUES (uuid_generate_v4(), $1,$2,$3,$4,$5,$6,$7,$8,$9, TRUE, $10)
    RETURNING id`,
    [
      input.name,
      input.mealSlot,
      input.difficulty,
      input.description ?? null,
      input.baseKcal ?? null,
      input.baseProtein ?? null,
      input.baseCarbs ?? null,
      input.baseFat ?? null,
      input.baseEstimatedCost ?? null,
      input.userId,
    ],
  );

  for (const ingredient of input.ingredients) {
    await pool.query(
      `INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, quantity, quantity_unit)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4)`,
      [recipeInsert.rows[0].id, ingredient.ingredientId, ingredient.quantity, ingredient.quantityUnit],
    );
  }

  return recipeInsert.rows[0].id;
}

export async function getRecipesWithIngredients(recipeIds: string[]): Promise<RecipeWithIngredients[]> {
  if (!recipeIds.length) {
    return [];
  }

  const recipeResult = await pool.query(
    `SELECT id, name, meal_slot, difficulty, description,
            base_kcal, base_protein, base_carbs, base_fat, base_estimated_cost,
            is_custom, created_by_user_id
     FROM recipes
     WHERE id = ANY($1::uuid[])`,
    [recipeIds],
  );

  const recipes = recipeResult.rows.map((row) => ({
    id: row.id,
    name: row.name,
    mealSlot: row.meal_slot,
    difficulty: row.difficulty,
    description: row.description,
    baseKcal: row.base_kcal,
    baseProtein: row.base_protein,
    baseCarbs: row.base_carbs,
    baseFat: row.base_fat,
    baseEstimatedCost: row.base_estimated_cost,
    isCustom: row.is_custom,
    createdByUserId: row.created_by_user_id,
    ingredients: [] as RecipeIngredientDetail[],
  }));

  if (!recipes.length) {
    return [];
  }

  const ingredientResult = await pool.query(
    `SELECT ri.recipe_id,
            ri.ingredient_id,
            ri.quantity,
            ri.quantity_unit,
            i.name,
            i.estimated_price_per_unit
     FROM recipe_ingredients ri
     LEFT JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE ri.recipe_id = ANY($1::uuid[])`,
    [recipeIds],
  );

  const grouped = new Map<string, RecipeIngredientDetail[]>();
  for (const row of ingredientResult.rows) {
    const list = grouped.get(row.recipe_id) ?? [];
    list.push({
      recipeId: row.recipe_id,
      ingredientId: row.ingredient_id,
      name: row.name ?? 'Unknown ingredient',
      quantity: Number(row.quantity),
      quantityUnit: row.quantity_unit,
      unitPrice: row.estimated_price_per_unit ? Number(row.estimated_price_per_unit) : null,
    });
    grouped.set(row.recipe_id, list);
  }

  return recipes.map((recipe) => ({
    ...recipe,
    ingredients: grouped.get(recipe.id) ?? [],
  }));
}
