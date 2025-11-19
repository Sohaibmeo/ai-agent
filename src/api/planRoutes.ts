import express from 'express';
import { z } from 'zod';

import { DEMO_USER_ID } from '../constants.js';
import { handlePlanAction, generateWeeklyPlan, getCurrentPlanForUser } from '../llm/orchestrator.js';
import { PlanActionContextSchema } from '../llm/schemas.js';

const router = express.Router();

router.post('/generate-week', async (_req, res, next) => {
  try {
    const plan = await generateWeeklyPlan(DEMO_USER_ID);
    res.json(plan);
  } catch (error) {
    next(error);
  }
});

router.post('/action', async (req, res, next) => {
  try {
    const body = z
      .object({
        weeklyPlanId: z.string(),
        actionContext: PlanActionContextSchema,
        reasonText: z.string().optional(),
      })
      .parse(req.body ?? {});
    const plan = await handlePlanAction({
      userId: DEMO_USER_ID,
      weeklyPlanId: body.weeklyPlanId,
      actionContext: body.actionContext,
      reasonText: body.reasonText,
    });
    res.json(plan);
  } catch (error) {
    next(error);
  }
});

router.get('/current', async (_req, res, next) => {
  try {
    const plan = await getCurrentPlanForUser(DEMO_USER_ID);
    res.json(plan);
  } catch (error) {
    next(error);
  }
});

export default router;
