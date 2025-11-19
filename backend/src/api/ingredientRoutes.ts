import express from 'express';
import { z } from 'zod';

import { DEMO_USER_ID } from '../constants.js';
import { createCustomIngredient } from '../db/repositories/ingredientRepo.js';
import { enrichIngredient } from '../llm/ingredientEnricher.js';

const router = express.Router();

const CustomIngredientSchema = z.object({
  name: z.string(),
  brand: z.string().optional(),
  unit: z.enum(['per_100g', 'per_piece', 'per_serving', 'per_ml']),
  kcalPerUnit: z.number(),
  proteinPerUnit: z.number(),
  carbsPerUnit: z.number(),
  fatPerUnit: z.number(),
  estimatedPricePerUnit: z.number(),
  tags: z.array(z.string()).default([]),
});

router.post('/custom', async (req, res, next) => {
  try {
    const payload = CustomIngredientSchema.parse(req.body);
    const id = await createCustomIngredient({
      userId: DEMO_USER_ID,
      ...payload,
    });
    res.json({ id });
  } catch (error) {
    next(error);
  }
});

router.post('/custom/enrich', async (req, res, next) => {
  try {
    const body = z
      .object({
        description: z.string().min(10),
        userId: z.string().optional(),
      })
      .parse(req.body ?? {});
    const suggestion = await enrichIngredient(body.description);
    res.json({ suggestion, userId: body.userId ?? null });
  } catch (error) {
    next(error);
  }
});

export default router;
