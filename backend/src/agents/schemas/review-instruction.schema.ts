import { z } from 'zod';

export const reviewInstructionSchema = z.object({
  action: z.enum([
    'regenerate_week',
    'regenerate_day',
    'regenerate_meal',
    'swap_meal',
    'swap_ingredient',
    'remove_ingredient',
    'adjust_recipe',
    'adjust_macros',
    'set_meal_type',
    'avoid_ingredient_future',
    'lock_meal',
    'lock_day',
    'set_fixed_breakfast',
    'no_change_clarify',
    'no_detectable_action',
  ]),

  targetLevel: z.enum(['week', 'day', 'meal', 'recipe']).optional(),

  targetIds: z
    .object({
      weeklyPlanId: z.string().uuid().optional(),
      planDayId: z.string().uuid().optional(),
      planDayIds: z.array(z.string().uuid()).optional(),
      planMealId: z.string().uuid().optional(),
      ingredientId: z.string().uuid().optional(),
    })
    .optional(),

  modifiers: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.array(z.any()), z.record(z.string(), z.any())]),
    )
    .optional(),

  notes: z.union([z.string(), z.array(z.string())]).optional(),

  // NEW: optional structured hints for recipe-level changes
  recipeChange: z
    .object({
      // e.g. "remove:avocado;add:apple"
      ingredientSwap: z.string().optional(),
    })
    .optional(),
});

export type ReviewInstruction = z.infer<typeof reviewInstructionSchema>;
