import { Router } from "express";
import { z } from "zod";
import { pool } from "../lib/db.js";

const recipeSchema = z.object({
  name: z.string().min(2),
  mealType: z.string(),
  calories: z.coerce.number().int().positive(),
  proteinGrams: z.coerce.number().int().nonnegative(),
  carbsGrams: z.coerce.number().int().nonnegative(),
  fatGrams: z.coerce.number().int().nonnegative(),
  costCents: z.coerce.number().int().nonnegative(),
  dietTags: z.array(z.string()).default([]),
  ingredients: z.array(z.string()).nonempty(),
  instructions: z.string().min(4),
});

export const recipeRouter = Router();

const mapRecipe = (row: any) => ({
  id: row.id,
  name: row.name,
  mealType: row.meal_type,
  calories: row.calories,
  proteinGrams: row.protein_grams,
  carbsGrams: row.carbs_grams,
  fatGrams: row.fat_grams,
  costCents: row.cost_cents,
  dietTags: row.diet_tags ?? [],
  ingredients: row.ingredients ?? [],
  instructions: row.instructions,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

recipeRouter.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM recipes ORDER BY created_at DESC");
    res.json(rows.map(mapRecipe));
  } catch (error) {
    next(error);
  }
});

recipeRouter.post("/", async (req, res, next) => {
  try {
    const data = recipeSchema.parse(req.body);
    const query = `
      INSERT INTO recipes
        (name, meal_type, calories, protein_grams, carbs_grams, fat_grams, cost_cents, diet_tags, ingredients, instructions, updated_at)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
      RETURNING *;
    `;
    const values = [
      data.name,
      data.mealType,
      data.calories,
      data.proteinGrams,
      data.carbsGrams,
      data.fatGrams,
      data.costCents,
      data.dietTags,
      data.ingredients,
      data.instructions,
    ];
    const result = await pool.query(query, values);
    res.status(201).json(mapRecipe(result.rows[0]));
  } catch (error) {
    next(error);
  }
});
