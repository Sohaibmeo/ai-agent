import express from 'express';
import { z } from 'zod';

import { DEMO_USER_ID } from '../constants.js';
import { createCustomRecipe } from '../db/repositories/recipeRepo.js';

const router = express.Router();

const CustomRecipeSchema = z.object({
  name: z.string(),
  mealSlot: z.enum(['breakfast', 'snack', 'lunch', 'dinner']),
  difficulty: z.enum(['super_easy', 'easy', 'medium', 'hard']),
  description: z.string().optional(),
  baseKcal: z.number().optional(),
  baseProtein: z.number().optional(),
  baseCarbs: z.number().optional(),
  baseFat: z.number().optional(),
  baseEstimatedCost: z.number().optional(),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string(),
        quantity: z.number().positive(),
        quantityUnit: z.string(),
      }),
    )
    .min(1),
});

router.post('/custom', async (req, res, next) => {
  try {
    const payload = CustomRecipeSchema.parse(req.body);
    const id = await createCustomRecipe({ userId: DEMO_USER_ID, ...payload });
    res.json({ id });
  } catch (error) {
    next(error);
  }
});

export default router;
