import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

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

recipeRouter.get("/", async (_req, res, next) => {
  try {
    const recipes = await prisma.recipe.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(recipes);
  } catch (error) {
    next(error);
  }
});

recipeRouter.post("/", async (req, res, next) => {
  try {
    const data = recipeSchema.parse(req.body);
    const recipe = await prisma.recipe.create({ data });
    res.status(201).json(recipe);
  } catch (error) {
    next(error);
  }
});
