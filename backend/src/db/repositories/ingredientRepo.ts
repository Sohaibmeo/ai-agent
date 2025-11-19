import { pool } from '../index.js';
import { IngredientRecord } from '../../types.js';

export async function listCatalogIngredients(userId: string): Promise<IngredientRecord[]> {
  const result = await pool.query(
    `SELECT id, name, brand, unit, kcal_per_unit, protein_per_unit, carbs_per_unit,
            fat_per_unit, estimated_price_per_unit, tags, is_custom, created_by_user_id
     FROM ingredients
     WHERE is_custom = FALSE OR created_by_user_id = $1
     ORDER BY name ASC`,
    [userId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    brand: row.brand,
    unit: row.unit,
    kcalPerUnit: Number(row.kcal_per_unit),
    proteinPerUnit: Number(row.protein_per_unit),
    carbsPerUnit: Number(row.carbs_per_unit),
    fatPerUnit: Number(row.fat_per_unit),
    estimatedPricePerUnit: Number(row.estimated_price_per_unit),
    tags: row.tags ?? [],
    isCustom: row.is_custom,
    createdByUserId: row.created_by_user_id,
  }));
}

export async function createCustomIngredient(input: {
  userId: string;
  name: string;
  brand?: string | null;
  unit: string;
  kcalPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
  estimatedPricePerUnit: number;
  tags: string[];
}) {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO ingredients (
      id, name, brand, unit,
      kcal_per_unit, protein_per_unit, carbs_per_unit, fat_per_unit,
      estimated_price_per_unit, tags, is_custom, created_by_user_id
    ) VALUES (uuid_generate_v4(), $1,$2,$3,$4,$5,$6,$7,$8,$9, TRUE, $10)
    RETURNING id`,
    [
      input.name,
      input.brand ?? null,
      input.unit,
      input.kcalPerUnit,
      input.proteinPerUnit,
      input.carbsPerUnit,
      input.fatPerUnit,
      input.estimatedPricePerUnit,
      input.tags,
      input.userId,
    ],
  );

  await pool.query(
    `INSERT INTO user_ingredient_price (id, user_id, ingredient_id, price_per_unit)
     VALUES (uuid_generate_v4(), $1, $2, $3)
     ON CONFLICT (user_id, ingredient_id) DO UPDATE SET price_per_unit = EXCLUDED.price_per_unit`,
    [input.userId, result.rows[0].id, input.estimatedPricePerUnit],
  );

  return result.rows[0].id;
}
