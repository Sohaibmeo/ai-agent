import fs from 'node:fs/promises';
import path from 'node:path';

import dotenv from 'dotenv';
import { PoolClient } from 'pg';

import { DEMO_USER_ID } from '../constants.js';
import { pool } from './index.js';
import { mockIngredients, mockRecipes } from './mockData.js';

dotenv.config();

async function ensureSchema(client: PoolClient) {
  const schemaPath = path.resolve('src/db/schema.sql');
  const ddl = await fs.readFile(schemaPath, 'utf-8');
  await client.query(ddl);
}

async function ensureDemoUser(client: PoolClient) {
  await client.query(
    `INSERT INTO users (id, email)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
    [DEMO_USER_ID, 'demo@meal.coach'],
  );

  await client.query(
    `INSERT INTO user_profile (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [DEMO_USER_ID],
  );

  await client.query(
    `INSERT INTO user_preferences (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [DEMO_USER_ID],
  );
}

async function upsertIngredients(client: PoolClient) {
  const nameToId = new Map<string, string>();

  for (const seed of mockIngredients) {
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM ingredients WHERE LOWER(name) = LOWER($1) AND is_custom = FALSE LIMIT 1`,
      [seed.name],
    );

    if (existing.rows.length) {
      const id = existing.rows[0].id;
      await client.query(
        `UPDATE ingredients
         SET brand = $2,
             unit = $3,
             kcal_per_unit = $4,
             protein_per_unit = $5,
             carbs_per_unit = $6,
             fat_per_unit = $7,
             estimated_price_per_unit = $8,
             tags = $9,
             updated_at = NOW()
         WHERE id = $1`,
        [
          id,
          seed.brand ?? null,
          seed.unit,
          seed.kcalPerUnit,
          seed.proteinPerUnit,
          seed.carbsPerUnit,
          seed.fatPerUnit,
          seed.estimatedPricePerUnit,
          seed.tags,
        ],
      );
      nameToId.set(seed.name, id);
      continue;
    }

    const insert = await client.query<{ id: string }>(
      `INSERT INTO ingredients (
        id,
        name,
        brand,
        unit,
        kcal_per_unit,
        protein_per_unit,
        carbs_per_unit,
        fat_per_unit,
        estimated_price_per_unit,
        tags,
        is_custom,
        created_by_user_id
      ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, NULL)
      RETURNING id`,
      [
        seed.name,
        seed.brand ?? null,
        seed.unit,
        seed.kcalPerUnit,
        seed.proteinPerUnit,
        seed.carbsPerUnit,
        seed.fatPerUnit,
        seed.estimatedPricePerUnit,
        seed.tags,
      ],
    );

    nameToId.set(seed.name, insert.rows[0].id);
  }

  return nameToId;
}

async function upsertRecipes(client: PoolClient, ingredientMap: Map<string, string>) {
  for (const recipe of mockRecipes) {
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM recipes WHERE LOWER(name) = LOWER($1) AND is_custom = FALSE LIMIT 1`,
      [recipe.name],
    );

    let recipeId: string;

    if (existing.rows.length) {
      recipeId = existing.rows[0].id;
      await client.query(
        `UPDATE recipes
         SET meal_slot = $2,
             difficulty = $3,
             description = $4,
             base_kcal = $5,
             base_protein = $6,
             base_carbs = $7,
             base_fat = $8,
             base_estimated_cost = $9,
             updated_at = NOW()
         WHERE id = $1`,
        [
          recipeId,
          recipe.mealSlot,
          recipe.difficulty,
          recipe.description ?? null,
          recipe.baseKcal,
          recipe.baseProtein,
          recipe.baseCarbs,
          recipe.baseFat,
          recipe.baseEstimatedCost,
        ],
      );

      await client.query(`DELETE FROM recipe_ingredients WHERE recipe_id = $1`, [recipeId]);
    } else {
      const insert = await client.query<{ id: string }>(
        `INSERT INTO recipes (
          id,
          name,
          meal_slot,
          difficulty,
          description,
          base_kcal,
          base_protein,
          base_carbs,
          base_fat,
          base_estimated_cost,
          is_custom,
          created_by_user_id
        ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, NULL)
        RETURNING id`,
        [
          recipe.name,
          recipe.mealSlot,
          recipe.difficulty,
          recipe.description ?? null,
          recipe.baseKcal,
          recipe.baseProtein,
          recipe.baseCarbs,
          recipe.baseFat,
          recipe.baseEstimatedCost,
        ],
      );
      recipeId = insert.rows[0].id;
    }

    for (const ingredient of recipe.ingredients) {
      const ingredientId = ingredientMap.get(ingredient.ingredientName);
      if (!ingredientId) {
        console.warn(`Missing ingredient for recipe seed: ${ingredient.ingredientName}`);
        continue;
      }

      await client.query(
        `INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, quantity, quantity_unit)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4)`,
        [recipeId, ingredientId, ingredient.quantity, ingredient.quantityUnit],
      );
    }
  }
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureSchema(client);
    await ensureDemoUser(client);
    const ingredientMap = await upsertIngredients(client);
    await upsertRecipes(client, ingredientMap);
    await client.query('COMMIT');
    console.log('Seed data applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to seed database', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
