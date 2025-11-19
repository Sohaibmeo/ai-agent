import express from 'express';
import { z } from 'zod';

import { DEMO_USER_ID } from '../constants.js';
import { getShoppingList, markHave, updateItemPrice } from '../db/repositories/shoppingListRepo.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const weeklyPlanId = z.string().parse(req.query.weeklyPlanId);
    const list = await getShoppingList(weeklyPlanId);
    res.json(list);
  } catch (error) {
    next(error);
  }
});

router.post('/mark-have', async (req, res, next) => {
  try {
    const payload = z
      .object({
        weeklyPlanId: z.string(),
        itemId: z.string(),
        have: z.boolean(),
      })
      .parse(req.body ?? {});
    await markHave(DEMO_USER_ID, payload.weeklyPlanId, payload.itemId, payload.have);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post('/update-price', async (req, res, next) => {
  try {
    const payload = z
      .object({
        itemId: z.string(),
        ingredientId: z.string().optional(),
        pricePerUnit: z.number().positive(),
      })
      .parse(req.body ?? {});
    await updateItemPrice(payload.itemId, DEMO_USER_ID, payload.ingredientId ?? null, payload.pricePerUnit);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
