import axios from "axios";
import { env } from "../config/env.js";
import { pool } from "../lib/db.js";
import { deriveMacroTargets } from "./nutrition.js";
import { AgentPlanResponse } from "../types/plan.js";
import { recordAgentRun, recordPlanEvent } from "../lib/orchestrator.js";

const mapPlanRow = (row: any) => ({
  id: row.id,
  userId: row.user_id,
  summary: row.summary,
  totalCalories: row.total_calories,
  totalProtein: row.total_protein,
  totalCostCents: row.total_cost_cents,
  planJson: row.plan_json,
  agentVersion: row.agent_version,
  createdAt: row.created_at,
});

export async function generatePlanForUser(userId: string) {
  const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);

  if (userResult.rowCount === 0) {
    throw new Error("User not found");
  }

  const user = userResult.rows[0];

  const macros = deriveMacroTargets({
    weightKg: user.weight_kg,
    heightCm: user.height_cm,
    age: user.age,
    activityLevel: user.activity_level,
    goal: user.fitness_goal,
  });

  const recipeResult = await pool.query("SELECT * FROM recipes LIMIT 25");

  const payload = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      region: user.region,
      weeklyBudgetCents: user.weekly_budget_cents,
      dietaryPreferences: user.dietary_preferences ?? [],
      excludedIngredients: user.excluded_ingredients ?? [],
      fitnessGoal: user.fitness_goal,
      activityLevel: user.activity_level,
    },
    macros,
    recipes: recipeResult.rows.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      mealType: recipe.meal_type,
      calories: recipe.calories,
      proteinGrams: recipe.protein_grams,
      costCents: recipe.cost_cents,
      dietTags: recipe.diet_tags ?? [],
    })),
  };

  const runId = await recordAgentRun({
    agentType: "coach",
    status: "pending",
    inputPayload: payload,
  });

  const { data } = await axios
    .post<AgentPlanResponse>(`${env.AGENT_SERVICE_URL}/plan/generate`, payload)
    .then(async (response) => {
      await recordAgentRun({
        agentType: "coach",
        status: "success",
        inputPayload: payload,
        outputPayload: response.data,
        runId,
      });
      return response;
    })
    .catch(async (error) => {
      await recordAgentRun({
        agentType: "coach",
        status: "failed",
        inputPayload: payload,
        outputPayload: error?.response?.data ?? { message: error.message },
        runId,
      });
      throw error;
    });

  const insertResult = await pool.query(
    `
      INSERT INTO meal_plans
        (user_id, summary, total_calories, total_protein, total_cost_cents, plan_json, agent_version, status)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,'ready')
      RETURNING *;
    `,
    [
      user.id,
      data.summary,
      data.totals.calories,
      data.totals.protein,
      data.totals.costCents,
      JSON.stringify(data.days),
      data.agentVersion,
    ],
  );

  const savedPlan = mapPlanRow(insertResult.rows[0]);

  await recordPlanEvent({
    planId: savedPlan.id,
    actor: "CoachAgent",
    action: "plan_generated",
    metadata: { agentRunId: runId },
  });

  return {
    plan: savedPlan,
    macros,
    agentResponse: data,
  };
}

export async function listPlansForUser(userId: string) {
  const { rows } = await pool.query(
    "SELECT * FROM meal_plans WHERE user_id = $1 ORDER BY created_at DESC",
    [userId],
  );

  return rows.map(mapPlanRow);
}
