import { z } from 'zod';

export const IngredientRefSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  quantity: z.number(),
  quantityUnit: z.string(),
  kcal: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
  estimatedCost: z.number().optional(),
});

export type IngredientRef = z.infer<typeof IngredientRefSchema>;

export const PlanMealSchema = z.object({
  id: z.string().optional(),
  mealType: z.enum(['breakfast', 'snack', 'lunch', 'dinner']),
  recipeId: z.string().nullable().optional(),
  recipeName: z.string(),
  portionMultiplier: z.number().default(1),
  kcal: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
  estimatedCost: z.number().optional(),
  ingredients: z.array(IngredientRefSchema).default([]),
});

export type PlanMeal = z.infer<typeof PlanMealSchema>;

export const PlanDaySchema = z.object({
  id: z.string().optional(),
  dayIndex: z.number().int().min(0).max(6),
  date: z.string().optional(),
  meals: z.array(PlanMealSchema),
  dailyEstimatedCost: z.number().optional(),
  dailyKcal: z.number().optional(),
});

export type PlanDay = z.infer<typeof PlanDaySchema>;

export const WeeklyPlanSchema = z.object({
  id: z.string().optional(),
  weekStartDate: z.string(),
  totalEstimatedCost: z.number().optional(),
  totalKcal: z.number().optional(),
  status: z.enum(['draft', 'active', 'superseded']).default('draft'),
  days: z.array(PlanDaySchema).min(1),
});

export type WeeklyPlan = z.infer<typeof WeeklyPlanSchema>;

export const ProfileSnippetSchema = z.object({
  dietaryRequirement: z.string().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  portionMode: z.string().nullable().optional(),
  weeklyBudgetGbp: z.number().nullable().optional(),
});

export type ProfileSnippet = z.infer<typeof ProfileSnippetSchema>;

export const GenerateWeekInputSchema = z.object({
  weekStartDate: z.string(),
  profile: ProfileSnippetSchema.extend({
    mealSchedule: z.object({
      breakfast: z.boolean(),
      snack: z.boolean(),
      lunch: z.boolean(),
      dinner: z.boolean(),
    }),
    ingredientsPreferred: z.array(z.string()),
    ingredientsAvoid: z.array(z.string()),
    cuisinesLiked: z.array(z.string()),
    cuisinesDisliked: z.array(z.string()),
  }),
  catalog: z.object({
    ingredients: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        tags: z.array(z.string()).optional(),
        unit: z.string(),
        kcalPerUnit: z.number().optional(),
        proteinPerUnit: z.number().optional(),
        carbsPerUnit: z.number().optional(),
        fatPerUnit: z.number().optional(),
        estimatedPricePerUnit: z.number().optional(),
      }),
    ),
    recipes: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        mealSlot: z.enum(['breakfast', 'snack', 'lunch', 'dinner']),
        difficulty: z.enum(['super_easy', 'easy', 'medium', 'hard']),
        baseKcal: z.number().nullable().optional(),
        baseProtein: z.number().nullable().optional(),
        baseCarbs: z.number().nullable().optional(),
        baseFat: z.number().nullable().optional(),
        baseEstimatedCost: z.number().nullable().optional(),
      }),
    ),
  }),
});

export type GenerateWeekInput = z.infer<typeof GenerateWeekInputSchema>;

export const ReviewInstructionSchema = z.object({
  action: z.string(),
  params: z.record(z.any()).default({}),
  summary: z.string().optional(),
});

export type ReviewInstruction = z.infer<typeof ReviewInstructionSchema>;

export const PlanActionContextSchema = z.object({
  type: z.enum([
    'regenerate_week',
    'regenerate_day',
    'regenerate_meal',
    'swap_all_ingredient',
    'remove_ingredient',
    'accept_week',
  ]),
  planDayId: z.string().optional(),
  planMealId: z.string().optional(),
  ingredientId: z.string().optional(),
  ingredientName: z.string().optional(),
});

export type PlanActionContext = z.infer<typeof PlanActionContextSchema>;
