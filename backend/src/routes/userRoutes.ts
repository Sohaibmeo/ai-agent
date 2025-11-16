import { Router } from "express";
import { z } from "zod";
import { mapUser, pool } from "../lib/db.js";

const userSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  email: z.string().email(),
  heightCm: z.coerce.number().int().positive(),
  weightKg: z.coerce.number().positive(),
  age: z.coerce.number().int().positive(),
  activityLevel: z.string(),
  weeklyBudget: z.coerce.number().positive(),
  dietaryPreferences: z.array(z.string()).default([]),
  excludedIngredients: z.array(z.string()).default([]),
  fitnessGoal: z.enum(["LOSE_FAT", "MAINTAIN", "GAIN_MUSCLE"]),
});

export const userRouter = Router();

userRouter.post("/", async (req, res, next) => {
  try {
    const data = userSchema.parse(req.body);
    const weeklyBudgetCents = Math.round(data.weeklyBudget * 100);

    const values = [
      data.name,
      data.email,
      data.heightCm,
      data.weightKg,
      data.age,
      data.activityLevel,
      weeklyBudgetCents,
      data.dietaryPreferences,
      data.excludedIngredients,
      data.fitnessGoal,
    ];

    const query = `
      INSERT INTO users
        (name, email, height_cm, weight_kg, age, activity_level, weekly_budget_cents, dietary_preferences, excluded_ingredients, fitness_goal, updated_at)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        height_cm = EXCLUDED.height_cm,
        weight_kg = EXCLUDED.weight_kg,
        age = EXCLUDED.age,
        activity_level = EXCLUDED.activity_level,
        weekly_budget_cents = EXCLUDED.weekly_budget_cents,
        dietary_preferences = EXCLUDED.dietary_preferences,
        excluded_ingredients = EXCLUDED.excluded_ingredients,
        fitness_goal = EXCLUDED.fitness_goal,
        updated_at = now()
      RETURNING *;
    `;

    const result = await pool.query(query, values);
    res.json(mapUser(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

userRouter.get("/:id", async (req, res, next) => {
  try {
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id]);

    if (userResult.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const plansResult = await pool.query(
      "SELECT * FROM meal_plans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3",
      [req.params.id],
    );

    res.json({
      ...mapUser(userResult.rows[0]),
      plans: plansResult.rows.map((plan) => ({
        id: plan.id,
        userId: plan.user_id,
        summary: plan.summary,
        totalCalories: plan.total_calories,
        totalProtein: plan.total_protein,
        totalCostCents: plan.total_cost_cents,
        planJson: plan.plan_json,
        agentVersion: plan.agent_version,
        createdAt: plan.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});
