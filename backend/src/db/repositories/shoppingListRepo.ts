import { pool } from '../index.js';
import { WeeklyPlan } from '../../llm/schemas.js';

function guessCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/(chicken|turkey|salmon|fish|tuna|beef)/.test(lower)) return 'Meat & Fish';
  if (/(milk|yogurt|cheese|halloumi)/.test(lower)) return 'Dairy & Eggs';
  if (/(rice|pasta|bread|wrap|bagel|couscous|oats)/.test(lower)) return 'Grains & Pasta';
  if (/(spinach|lettuce|tomato|courgette|avocado|potato|onion|peas|salad)/.test(lower)) return 'Vegetables & Fruits';
  if (/(oil|spice|garlic|chia|pumpkin)/.test(lower)) return 'Pantry & Spices';
  return 'Other';
}

export async function rebuildShoppingListFromPlan(weeklyPlanId: string, plan: WeeklyPlan) {
  await pool.query('DELETE FROM shopping_list_items WHERE weekly_plan_id = $1', [weeklyPlanId]);

  const aggregate = new Map<string, { name: string; ingredientId?: string; quantity: number; unit: string; estimatedCost?: number }>();

  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const ingredient of meal.ingredients ?? []) {
        const key = `${ingredient.name}|${ingredient.quantityUnit}`;
        const entry = aggregate.get(key) ?? {
          name: ingredient.name,
          ingredientId: ingredient.id,
          quantity: 0,
          unit: ingredient.quantityUnit,
          estimatedCost: 0,
        };
        entry.quantity += ingredient.quantity;
        entry.estimatedCost = (entry.estimatedCost ?? 0) + (ingredient.estimatedCost ?? 0);
        aggregate.set(key, entry);
      }
    }
  }

  for (const entry of aggregate.values()) {
    await pool.query(
      `INSERT INTO shopping_list_items (
        id, weekly_plan_id, ingredient_id, name, quantity, quantity_unit, estimated_cost, category
      ) VALUES (uuid_generate_v4(), $1,$2,$3,$4,$5,$6,$7)`,
      [
        weeklyPlanId,
        entry.ingredientId ?? null,
        entry.name,
        entry.quantity,
        entry.unit,
        entry.estimatedCost ?? null,
        guessCategory(entry.name),
      ],
    );
  }
}

export async function getShoppingList(weeklyPlanId: string) {
  const result = await pool.query(
    `SELECT id, name, quantity, quantity_unit, estimated_cost, category, have
     FROM shopping_list_items WHERE weekly_plan_id = $1 ORDER BY category, name`,
    [weeklyPlanId],
  );
  return result.rows;
}

export async function markHave(userId: string, weeklyPlanId: string, itemId: string, have: boolean) {
  await pool.query(`UPDATE shopping_list_items SET have = $3 WHERE id = $1 AND weekly_plan_id = $2`, [
    itemId,
    weeklyPlanId,
    have,
  ]);

  const item = await pool.query<{ ingredient_id: string | null }>(
    `SELECT ingredient_id FROM shopping_list_items WHERE id = $1`,
    [itemId],
  );

  const ingredientId = item.rows[0]?.ingredient_id;
  if (!ingredientId) {
    return;
  }

  if (have) {
    await pool.query(
      `INSERT INTO pantry_items (id, user_id, ingredient_id, have)
       VALUES (uuid_generate_v4(), $1,$2, TRUE)
       ON CONFLICT (user_id, ingredient_id) DO UPDATE SET have = TRUE, updated_at = NOW()`,
      [userId, ingredientId],
    );
  } else {
    await pool.query(
      `UPDATE pantry_items SET have = FALSE, updated_at = NOW()
       WHERE user_id = $1 AND ingredient_id = $2`,
      [userId, ingredientId],
    );
  }
}

export async function updateItemPrice(
  itemId: string,
  userId: string,
  ingredientId: string | null,
  pricePerUnit: number,
) {
  await pool.query(`UPDATE shopping_list_items SET estimated_cost = $2 WHERE id = $1`, [
    itemId,
    pricePerUnit,
  ]);

  if (ingredientId) {
    await pool.query(
      `INSERT INTO user_ingredient_price (id, user_id, ingredient_id, price_per_unit)
       VALUES (uuid_generate_v4(), $1, $2, $3)
       ON CONFLICT (user_id, ingredient_id)
       DO UPDATE SET price_per_unit = EXCLUDED.price_per_unit, updated_at = NOW()`,
      [userId, ingredientId, pricePerUnit],
    );
  }
}
