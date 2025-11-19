import { randomUUID } from 'node:crypto';

import { PoolClient } from 'pg';

import { withTransaction } from '../index.js';
import { PlanDay, PlanMeal, WeeklyPlan } from '../../llm/schemas.js';
import { pool } from '../index.js';

async function insertPlanDays(client: PoolClient, weeklyPlanId: string, days: PlanDay[]) {
  for (const day of days) {
    const dayId = randomUUID();
    await client.query(
      `INSERT INTO plan_days (id, weekly_plan_id, day_index, date, daily_estimated_cost, daily_kcal)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        dayId,
        weeklyPlanId,
        day.dayIndex,
        day.date ?? null,
        day.dailyEstimatedCost ?? null,
        day.dailyKcal ?? null,
      ],
    );

    for (const meal of day.meals) {
      await insertPlanMeal(client, dayId, meal);
    }
  }
}

async function insertPlanMeal(client: PoolClient, planDayId: string, meal: PlanMeal) {
  const mealId = randomUUID();
  await client.query(
    `INSERT INTO plan_meals (
      id, plan_day_id, meal_type, recipe_id, recipe_name, portion_multiplier,
      kcal, protein, carbs, fat, estimated_cost
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      mealId,
      planDayId,
      meal.mealType,
      meal.recipeId ?? null,
      meal.recipeName,
      meal.portionMultiplier ?? 1,
      meal.kcal ?? null,
      meal.protein ?? null,
      meal.carbs ?? null,
      meal.fat ?? null,
      meal.estimatedCost ?? null,
    ],
  );

  for (const ingredient of meal.ingredients ?? []) {
    const ingredientId = ingredient.id ?? null;
    await client.query(
      `INSERT INTO plan_meal_ingredients (
        id, plan_meal_id, ingredient_id, name, quantity, quantity_unit, estimated_cost
      ) VALUES (uuid_generate_v4(), $1,$2,$3,$4,$5,$6)`,
      [
        mealId,
        ingredientId,
        ingredient.name,
        ingredient.quantity,
        ingredient.quantityUnit,
        ingredient.estimatedCost ?? null,
      ],
    );
  }
}

export async function saveWeeklyPlan(userId: string, plan: WeeklyPlan): Promise<string> {
  const planId = plan.id ?? randomUUID();
  await withTransaction(async (client) => {
    await client.query('DELETE FROM weekly_plans WHERE id = $1', [planId]);
    await client.query(
      `INSERT INTO weekly_plans (id, user_id, week_start_date, total_estimated_cost, total_kcal, status)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        planId,
        userId,
        plan.weekStartDate,
        plan.totalEstimatedCost ?? null,
        plan.totalKcal ?? null,
        plan.status ?? 'draft',
      ],
    );
    await insertPlanDays(client, planId, plan.days);
  });
  return planId;
}

async function fetchPlanRows(weeklyPlanId: string) {
  const planResult = await pool.query(
    `SELECT id, user_id, week_start_date, total_estimated_cost, total_kcal, status
     FROM weekly_plans WHERE id = $1`,
    [weeklyPlanId],
  );

  if (!planResult.rows.length) {
    return null;
  }

  const planRow = planResult.rows[0];
  const dayResult = await pool.query(
    `SELECT id, day_index, date, daily_estimated_cost, daily_kcal
     FROM plan_days WHERE weekly_plan_id = $1 ORDER BY day_index`,
    [weeklyPlanId],
  );

  const days: PlanDay[] = [];
  for (const dayRow of dayResult.rows) {
    const mealsResult = await pool.query(
      `SELECT id, meal_type, recipe_id, recipe_name, portion_multiplier, kcal, protein, carbs, fat, estimated_cost
       FROM plan_meals WHERE plan_day_id = $1 ORDER BY meal_type`,
      [dayRow.id],
    );

    const meals: PlanMeal[] = [];
    for (const mealRow of mealsResult.rows) {
      const ingredientsResult = await pool.query(
        `SELECT ingredient_id, name, quantity, quantity_unit, estimated_cost
         FROM plan_meal_ingredients WHERE plan_meal_id = $1`,
        [mealRow.id],
      );

      meals.push({
        id: mealRow.id,
        mealType: mealRow.meal_type,
        recipeId: mealRow.recipe_id,
        recipeName: mealRow.recipe_name,
        portionMultiplier: Number(mealRow.portion_multiplier),
        kcal: mealRow.kcal ? Number(mealRow.kcal) : undefined,
        protein: mealRow.protein ? Number(mealRow.protein) : undefined,
        carbs: mealRow.carbs ? Number(mealRow.carbs) : undefined,
        fat: mealRow.fat ? Number(mealRow.fat) : undefined,
        estimatedCost: mealRow.estimated_cost ? Number(mealRow.estimated_cost) : undefined,
        ingredients: ingredientsResult.rows.map((ingredient) => ({
          id: ingredient.ingredient_id ?? undefined,
          name: ingredient.name,
          quantity: Number(ingredient.quantity),
          quantityUnit: ingredient.quantity_unit,
          estimatedCost: ingredient.estimated_cost ? Number(ingredient.estimated_cost) : undefined,
        })),
      });
    }

    days.push({
      id: dayRow.id,
      dayIndex: dayRow.day_index,
      date: dayRow.date ?? undefined,
      dailyEstimatedCost: dayRow.daily_estimated_cost ? Number(dayRow.daily_estimated_cost) : undefined,
      dailyKcal: dayRow.daily_kcal ? Number(dayRow.daily_kcal) : undefined,
      meals,
    });
  }

  return {
    id: planRow.id,
    userId: planRow.user_id,
    weekStartDate: planRow.week_start_date,
    totalEstimatedCost: planRow.total_estimated_cost ? Number(planRow.total_estimated_cost) : undefined,
    totalKcal: planRow.total_kcal ? Number(planRow.total_kcal) : undefined,
    status: planRow.status,
    days,
  } satisfies WeeklyPlan & { userId: string };
}

export async function getWeeklyPlanById(weeklyPlanId: string): Promise<WeeklyPlan | null> {
  const data = await fetchPlanRows(weeklyPlanId);
  if (!data) return null;
  return {
    id: data.id,
    weekStartDate: data.weekStartDate,
    totalEstimatedCost: data.totalEstimatedCost,
    totalKcal: data.totalKcal,
    status: data.status as WeeklyPlan['status'],
    days: data.days,
  };
}

export async function getCurrentPlan(userId: string): Promise<WeeklyPlan | null> {
  const result = await pool.query(
    `SELECT id FROM weekly_plans
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );

  if (!result.rows.length) {
    return null;
  }

  return getWeeklyPlanById(result.rows[0].id);
}

export async function markPlanStatus(weeklyPlanId: string, status: 'draft' | 'active' | 'superseded') {
  await pool.query(`UPDATE weekly_plans SET status = $2 WHERE id = $1`, [weeklyPlanId, status]);
}
