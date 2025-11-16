import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

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

    const user = data.id
      ? await prisma.userProfile.update({
          where: { id: data.id },
          data: {
            name: data.name,
            email: data.email,
            heightCm: data.heightCm,
            weightKg: data.weightKg,
            age: data.age,
            activityLevel: data.activityLevel,
            weeklyBudgetCents,
            dietaryPreferences: data.dietaryPreferences,
            excludedIngredients: data.excludedIngredients,
            fitnessGoal: data.fitnessGoal,
          },
        })
      : await prisma.userProfile.upsert({
          where: { email: data.email },
          update: {
            name: data.name,
            heightCm: data.heightCm,
            weightKg: data.weightKg,
            age: data.age,
            activityLevel: data.activityLevel,
            weeklyBudgetCents,
            dietaryPreferences: data.dietaryPreferences,
            excludedIngredients: data.excludedIngredients,
            fitnessGoal: data.fitnessGoal,
          },
          create: {
            name: data.name,
            email: data.email,
            heightCm: data.heightCm,
            weightKg: data.weightKg,
            age: data.age,
            activityLevel: data.activityLevel,
            weeklyBudgetCents,
            dietaryPreferences: data.dietaryPreferences,
            excludedIngredients: data.excludedIngredients,
            fitnessGoal: data.fitnessGoal,
          },
        });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

userRouter.get("/:id", async (req, res, next) => {
  try {
    const user = await prisma.userProfile.findUnique({
      where: { id: req.params.id },
      include: { plans: { orderBy: { createdAt: "desc" }, take: 3 } },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});
