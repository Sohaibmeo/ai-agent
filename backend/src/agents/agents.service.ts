import { Injectable } from '@nestjs/common';
import { z } from 'zod';

const ReviewInstructionSchema = z.object({
  action: z.string(),
  targetMealId: z.string().optional(),
  notes: z.string().optional(),
  constraints: z.array(z.string()).optional(),
});

const PlanMealSchema = z.object({
  meal_slot: z.string(),
  recipe_id: z.string(),
  portion_multiplier: z.number().optional(),
});

const PlanDaySchema = z.object({
  day_index: z.number(),
  meals: z.array(PlanMealSchema),
});

const WeeklyPlanSchema = z.object({
  week_start_date: z.string(),
  days: z.array(PlanDaySchema),
});

@Injectable()
export class AgentsService {
  private reviewModel = process.env.LLM_MODEL_REVIEW || 'local-review';
  private coachModel = process.env.LLM_MODEL_COACH || 'local-coach';
  private baseUrl = process.env.LLM_BASE_URL || 'http://localhost:11434/v1';

  async reviewAction(payload: unknown) {
    // Placeholder: in future, call LLM and validate with Zod.
    const result = ReviewInstructionSchema.parse({
      action: 'noop',
      notes: 'stubbed review action',
      ...((payload as any) || {}),
    });
    return result;
  }

  async coachPlan(payload: { profile: unknown; candidates: unknown }) {
    // Placeholder: in future, call LLM and validate with Zod.
    const result = WeeklyPlanSchema.parse({
      week_start_date: new Date().toISOString().slice(0, 10),
      days: [],
    });
    return result;
  }
}
