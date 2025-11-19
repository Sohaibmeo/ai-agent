export interface UserProfile {
  userId: string;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: string | null;
  dietaryRequirement: string | null;
  recipeDifficulty: string | null;
  portionMode: string | null;
  weeklyBudgetGbp: number | null;
  mealBreakfast: boolean;
  mealSnack: boolean;
  mealLunch: boolean;
  mealDinner: boolean;
}

export interface UserPreferences {
  userId: string;
  ingredientsPreferred: string[];
  ingredientsAvoid: string[];
  mustHaveIngredients: string[];
  cuisinesLiked: string[];
  cuisinesDisliked: string[];
  recipesPreferred: string[];
}

export interface IngredientRecord {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  kcalPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
  estimatedPricePerUnit: number;
  tags: string[];
  isCustom: boolean;
  createdByUserId: string | null;
}

export interface RecipeRecord {
  id: string;
  name: string;
  mealSlot: 'breakfast' | 'snack' | 'lunch' | 'dinner';
  difficulty: 'super_easy' | 'easy' | 'medium' | 'hard';
  description: string | null;
  baseKcal: number | null;
  baseProtein: number | null;
  baseCarbs: number | null;
  baseFat: number | null;
  baseEstimatedCost: number | null;
  isCustom: boolean;
  createdByUserId: string | null;
}

export interface RecipeIngredientRecord {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: number;
  quantityUnit: string;
}

export interface WeeklyPlanRecord {
  id: string;
  userId: string;
  weekStartDate: string;
  totalEstimatedCost: number | null;
  totalKcal: number | null;
  status: string;
}

export interface PlanDayRecord {
  id: string;
  weeklyPlanId: string;
  dayIndex: number;
  date: string | null;
  dailyEstimatedCost: number | null;
  dailyKcal: number | null;
}

export interface PlanMealRecord {
  id: string;
  planDayId: string;
  mealType: string;
  recipeId: string | null;
  recipeName: string;
  portionMultiplier: number;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  estimatedCost: number | null;
}

export interface PlanMealIngredientRecord {
  id: string;
  planMealId: string;
  ingredientId: string | null;
  name: string;
  quantity: number;
  quantityUnit: string;
  estimatedCost: number | null;
}
