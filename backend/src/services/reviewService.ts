import axios from "axios";
import { env } from "../config/env.js";
import { pool } from "../lib/db.js";
import { recordAgentRun, recordPlanEvent } from "../lib/orchestrator.js";
import { AgentPlanResponse } from "../types/plan.js";

function mapPlan(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    summary: row.summary,
    planJson: row.plan_json,
    totalCalories: row.total_calories,
    totalProtein: row.total_protein,
    totalCostCents: row.total_cost_cents,
    agentVersion: row.agent_version,
    status: row.status,
    version: row.version,
    createdAt: row.created_at,
  };
}

export async function submitReviewRequest(planId: string, requestText: string, userId: string) {
  const planResult = await pool.query("SELECT * FROM meal_plans WHERE id = $1", [planId]);
  if (planResult.rowCount === 0) {
    throw new Error("Plan not found");
  }

  const plan = mapPlan(planResult.rows[0]);

  await recordPlanEvent({
    planId,
    actor: "User",
    action: "review_requested",
    metadata: { requestText, userId },
  });

  const payload = {
    request: requestText,
    plan: {
      summary: plan.summary,
      agentVersion: plan.agentVersion,
      days: plan.planJson,
      totals: {
        calories: plan.totalCalories,
        protein: plan.totalProtein,
        costCents: plan.totalCostCents,
      },
    },
  };

  const runId = await recordAgentRun({
    agentType: "review",
    status: "pending",
    inputPayload: payload,
  });

  const { data } = await axios
    .post<{ updatedPlan: AgentPlanResponse; rationale: string }>(
      `${env.AGENT_SERVICE_URL}/plan/review`,
      payload,
    )
    .then(async (response) => {
      await recordAgentRun({
        agentType: "review",
        status: "success",
        inputPayload: payload,
        outputPayload: response.data,
        runId,
      });
      return response;
    })
    .catch(async (error) => {
      await recordAgentRun({
        agentType: "review",
        status: "failed",
        inputPayload: payload,
        outputPayload: error?.response?.data ?? { message: error.message },
        runId,
      });
      throw error;
    });

  const planUpdate = data.updatedPlan;
  const updated = await pool.query(
    `UPDATE meal_plans SET
      summary = $1,
      total_calories = $2,
      total_protein = $3,
      total_cost_cents = $4,
      plan_json = $5,
      agent_version = $6,
      version = version + 1,
      status = 'ready'
    WHERE id = $7
    RETURNING *`,
    [
      planUpdate.summary,
      planUpdate.totals.calories,
      planUpdate.totals.protein,
      planUpdate.totals.costCents,
      JSON.stringify(planUpdate.days),
      planUpdate.agentVersion,
      planId,
    ],
  );

  await pool.query(
    `INSERT INTO plan_reviews (plan_id, user_request, agent_response) VALUES ($1,$2,$3)` ,
    [planId, requestText, JSON.stringify(planUpdate)],
  );

  await recordPlanEvent({
    planId,
    actor: "ReviewAgent",
    action: "plan_updated",
    metadata: { agentRunId: runId, rationale: data.rationale },
  });

  return mapPlan(updated.rows[0]);
}
