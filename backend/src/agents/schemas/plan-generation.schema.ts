import { z } from 'zod';

export const DayMealIngredientSchema = z.object({
  ingredient_name: z.string(),
  quantity: z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, z.number()),
  unit: z.string(),
});

export const DayMealSchema = z.object({
  meal_slot: z.string(),
  name: z.string(),
  difficulty: z.string().optional(),
  instructions: z.union([z.string(), z.array(z.string())]),
  ingredients: z.array(DayMealIngredientSchema),
  target_kcal: z.number().optional(),
  target_protein: z.number().optional(),
  compliance_notes: z.string().optional(),
});

export const PlanDaySchema = z.object({
  day_index: z.number(),
  meals: z.array(DayMealSchema),
});

export const WeeklyPlanSchema = z.object({
  week_start_date: z.string(),
  days: z.array(PlanDaySchema),
});

export const RecipeStubSchema = z.object({
  name: z.string(),
  meal_slot: z.string(),
  meal_type: z.string().optional(),
  difficulty: z.string().optional(),
  base_cost_gbp: z.number().optional(),
  instructions: z.any().optional(),
  ingredients: z.array(
    z.object({
      ingredient_name: z.string(),
      quantity: z.number(),
      unit: z.string().optional(),
    }),
  ),
});

export const DayWithRecipesSchema = z.object({
  day_index: z.number(),
  meals: z.array(
    z.object({
      meal_slot: z.string(),
      recipe: RecipeStubSchema,
    }),
  ),
});

export type LlmDayMeal = z.infer<typeof DayMealSchema>;
export type LlmPlanDay = z.infer<typeof PlanDaySchema>;
export type DayWithRecipes = z.infer<typeof DayWithRecipesSchema>;
export type WeeklyPlanLlm = z.infer<typeof WeeklyPlanSchema>;
