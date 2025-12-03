import { z } from 'zod';

export type TargetLevel = 'week' | 'day' | 'meal' | 'ingredient';

export type ActionType =
  | 'generate_new_week'
  | 'regenerate_week'
  | 'regenerate_day'
  | 'regenerate_meal'
  | 'swap_meal'
  | 'swap_ingredient'
  | 'remove_ingredient'
  | 'avoid_ingredient_future'
  | 'adjust_portion'
  | 'change_meal_type'
  | 'ai_adjust_recipe';

export type ReviewInstructionParams = {
  ingredientToRemove?: string;
  ingredientToAdd?: string;
  applyToWholeWeek?: boolean;
  makeHealthier?: boolean;
  makeCheaper?: boolean;
  makeHigherProtein?: boolean;
  keepCaloriesSimilar?: boolean;
  smallerPortion?: boolean;
  largerPortion?: boolean;
  preferMealType?: 'solid' | 'drinkable';
};

export type ReviewInstruction = {
  targetLevel: TargetLevel;
  targetIds?: {
    weeklyPlanId?: string;
    planDayId?: string;
    planMealId?: string;
    ingredientId?: string;
  };
  action: ActionType;
  params?: ReviewInstructionParams;
  notes?: string;
};

export const reviewInstructionSchema = z.object({
  targetLevel: z.enum(['week', 'day', 'meal', 'ingredient']),
  targetIds: z
    .object({
      weeklyPlanId: z.string().uuid().optional(),
      planDayId: z.string().uuid().optional(),
      planMealId: z.string().uuid().optional(),
      ingredientId: z.string().uuid().optional(),
    })
    .partial()
    .optional(),
  action: z.enum([
    'generate_new_week',
    'regenerate_week',
    'regenerate_day',
    'regenerate_meal',
    'swap_meal',
    'swap_ingredient',
    'remove_ingredient',
    'avoid_ingredient_future',
    'adjust_portion',
    'change_meal_type',
    'ai_adjust_recipe',
  ]),
  params: z
    .object({
      ingredientToRemove: z.string().uuid().optional(),
      ingredientToAdd: z.string().uuid().optional(),
      applyToWholeWeek: z.boolean().optional(),
      makeHealthier: z.boolean().optional(),
      makeCheaper: z.boolean().optional(),
      makeHigherProtein: z.boolean().optional(),
      keepCaloriesSimilar: z.boolean().optional(),
      smallerPortion: z.boolean().optional(),
      largerPortion: z.boolean().optional(),
      preferMealType: z.enum(['solid', 'drinkable']).optional(),
    })
    .partial()
    .optional(),
  notes: z.string().optional(),
});
