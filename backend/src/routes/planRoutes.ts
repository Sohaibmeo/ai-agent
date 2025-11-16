import { Router } from "express";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { generatePlanForUser, listPlansForUser } from "../services/planService.js";

const planRequestSchema = z.object({
  userId: z.string().uuid(),
});

export const planRouter = Router();

planRouter.post("/generate", async (req, res, next) => {
  try {
    const { userId } = planRequestSchema.parse(req.body);
    const result = await generatePlanForUser(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

planRouter.get("/detail/:planId", async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM meal_plans WHERE id = $1", [req.params.planId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const row = result.rows[0];
    res.json({
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
  } catch (error) {
    next(error);
  }
});

planRouter.get("/:userId", async (req, res, next) => {
  try {
    const plans = await listPlansForUser(req.params.userId);
    res.json(plans);
  } catch (error) {
    next(error);
  }
});
