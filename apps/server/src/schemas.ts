import { z } from 'zod';

export const IngredientRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number(),
  quantityUnit: z.string(),
  kcal: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
  estimatedCost: z.number().optional()
});

export const PlanMealSchema = z.object({
  id: z.string(),
  mealType: z.enum(['breakfast', 'snack', 'lunch', 'dinner']),
  recipeId: z.string().nullable(),
  recipeName: z.string(),
  portionMultiplier: z.number(),
  kcal: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
  estimatedCost: z.number().optional(),
  ingredients: z.array(IngredientRefSchema)
});

export const PlanDaySchema = z.object({
  id: z.string(),
  dayIndex: z.number().int().min(0).max(6),
  date: z.string().optional(),
  meals: z.array(PlanMealSchema),
  dailyEstimatedCost: z.number().optional(),
  dailyKcal: z.number().optional()
});

export const WeeklyPlanSchema = z.object({
  id: z.string(),
  userId: z.string(),
  weekStartDate: z.string(),
  status: z.enum(['draft', 'active', 'superseded']),
  days: z.array(PlanDaySchema),
  totalEstimatedCost: z.number().optional(),
  totalKcal: z.number().optional()
});

export const ShoppingListItemSchema = z.object({
  id: z.string(),
  ingredientId: z.string(),
  name: z.string(),
  requiredQuantity: z.number(),
  quantityUnit: z.string(),
  estimatedCost: z.number().optional(),
  isInPantry: z.boolean(),
  userMarkedHave: z.boolean()
});

export const ShoppingListSchema = z.object({
  weeklyPlanId: z.string(),
  items: z.array(ShoppingListItemSchema),
  totalEstimatedCost: z.number().optional()
});

export const GenerateWeekInputSchema = z.object({
  userId: z.string(),
  profile: z.object({
    age: z.number().optional(),
    heightCm: z.number().optional(),
    weightKg: z.number().optional(),
    activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active']),
    dietType: z.enum([
      'none',
      'halal',
      'vegan',
      'vegetarian',
      'keto',
      'gluten_free',
      'lactose_free'
    ]),
    recipeDifficulty: z.enum(['super_easy', 'easy', 'medium', 'hard']),
    portionMode: z.enum(['cutting', 'maintenance', 'bulking']),
    weeklyBudgetGbp: z.number().optional(),
    enableBreakfast: z.boolean(),
    enableSnacks: z.boolean(),
    enableLunch: z.boolean(),
    enableDinner: z.boolean()
  }),
  preferences: z.object({
    ingredientsPreferred: z.array(z.string()),
    ingredientsAvoid: z.array(z.string()),
    mustHaveIngredients: z.array(z.string()),
    recipesPreferred: z.array(z.string()),
    cuisinesLiked: z.array(z.string()),
    cuisinesDisliked: z.array(z.string())
  })
});

export const ReviewInstructionSchema = z.object({
  targetLevel: z.enum(['week', 'day', 'meal', 'ingredient']),
  targetIds: z
    .object({
      weeklyPlanId: z.string().optional(),
      planDayId: z.string().optional(),
      planMealId: z.string().optional(),
      ingredientId: z.string().optional()
    })
    .optional(),
  action: z.enum([
    'generate_new_week',
    'regenerate_week',
    'regenerate_day',
    'regenerate_meal',
    'swap_ingredient',
    'remove_ingredient'
  ]),
  params: z
    .object({
      ingredientToRemove: z.string().optional(),
      ingredientToAdd: z.string().optional(),
      applyToWholeWeek: z.boolean().optional(),
      makeHealthier: z.boolean().optional(),
      makeCheaper: z.boolean().optional(),
      makeHigherProtein: z.boolean().optional(),
      easierDifficulty: z.boolean().optional(),
      preferMealType: z.enum(['drinkable', 'solid']).optional(),
      keepCaloriesSimilar: z.boolean().optional()
    })
    .optional()
});

export type IngredientRef = z.infer<typeof IngredientRefSchema>;
export type PlanMeal = z.infer<typeof PlanMealSchema>;
export type PlanDay = z.infer<typeof PlanDaySchema>;
export type WeeklyPlan = z.infer<typeof WeeklyPlanSchema>;
export type ShoppingListItem = z.infer<typeof ShoppingListItemSchema>;
export type ShoppingList = z.infer<typeof ShoppingListSchema>;
export type GenerateWeekInput = z.infer<typeof GenerateWeekInputSchema>;
export type ReviewInstruction = z.infer<typeof ReviewInstructionSchema>;
