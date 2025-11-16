import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
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
    const plan = await prisma.mealPlan.findUnique({
      where: { id: req.params.planId },
    });

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    res.json(plan);
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
