import { Router } from "express";
import { z } from "zod";
import { generateWeeklyPlan } from "../services/coachAgent.js";
import { reviewWeeklyPlan } from "../services/reviewAgent.js";
import { agentResponseSchema } from "../services/planSchemas.js";

const requestSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    weeklyBudgetCents: z.number(),
    dietaryPreferences: z.array(z.string()),
    excludedIngredients: z.array(z.string()),
    fitnessGoal: z.string(),
    activityLevel: z.string(),
  }),
  macros: z.object({
    calories: z.number(),
    proteinGrams: z.number(),
    fatsGrams: z.number(),
    carbsGrams: z.number(),
  }),
  recipes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      mealType: z.string(),
      calories: z.number(),
      proteinGrams: z.number(),
      costCents: z.number(),
      dietTags: z.array(z.string()),
    }),
  ),
});

export const planRouter = Router();

planRouter.post("/generate", async (req, res, next) => {
  try {
    const payload = requestSchema.parse(req.body);
    const plan = await generateWeeklyPlan(payload);
    res.json(plan);
  } catch (error) {
    next(error);
  }
});

const reviewRequestSchema = z.object({
  plan: agentResponseSchema,
  request: z.string().min(3),
});

planRouter.post("/review", async (req, res, next) => {
  try {
    const payload = reviewRequestSchema.parse(req.body);
    const plan = await reviewWeeklyPlan(payload);
    res.json(plan);
  } catch (error) {
    next(error);
  }
});
