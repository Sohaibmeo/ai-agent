import { z } from 'zod';

const idSchema = z.string().min(1);

const targetIdsSchema = z.object({
  weeklyPlanId: idSchema.optional(),
  planDayIds: z.array(idSchema).optional(),
  planDayId: idSchema.optional(),
  planMealId: idSchema.optional(),
  recipeId: idSchema.optional(),
  ingredientId: idSchema.optional(),
});

export const reviewInstructionSchema = z.object({
  action: z
    .enum([
      'regenerate_week',
      'regenerate_day',
      'regenerate_meal',
      'swap_meal',
      'swap_ingredient',
      'remove_ingredient',
      'adjust_macros',
      'set_meal_type',
      'lock_meal',
      'lock_day',
      'set_fixed_breakfast',
      'avoid_ingredient_future',
      'adjust_recipe',
      'ai_adjust_recipe',
      'no_change_clarify',
      'no_detectable_action',
    ])
    .catch('no_detectable_action'),
  targetLevel: z.enum(['week', 'day', 'meal', 'recipe', 'ingredient']).optional(),
  targetIds: targetIdsSchema.optional(),
  modifiers: z.union([z.record(z.string(), z.any()), z.array(z.any()).transform((arr) => ({ flags: arr }))]).optional(),
  notes: z.union([z.string(), z.array(z.string()).transform((arr) => arr.join('; ')), z.null()]).optional(),
});

export type ReviewInstruction = z.infer<typeof reviewInstructionSchema>;
