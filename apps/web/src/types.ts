export type MealType = 'breakfast' | 'snack' | 'lunch' | 'dinner';

export interface IngredientRef {
  id: string;
  name: string;
  quantity: number;
  quantityUnit: string;
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  estimatedCost?: number;
}

export interface PlanMeal {
  id: string;
  mealType: MealType;
  recipeId: string | null;
  recipeName: string;
  portionMultiplier: number;
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  estimatedCost?: number;
  ingredients: IngredientRef[];
}

export interface PlanDay {
  id: string;
  dayIndex: number;
  date?: string;
  meals: PlanMeal[];
  dailyEstimatedCost?: number;
  dailyKcal?: number;
}

export interface WeeklyPlan {
  id: string;
  userId: string;
  weekStartDate: string;
  status: 'draft' | 'active' | 'superseded';
  days: PlanDay[];
  totalEstimatedCost?: number;
  totalKcal?: number;
}

export interface ShoppingListItem {
  id: string;
  ingredientId: string;
  name: string;
  requiredQuantity: number;
  quantityUnit: string;
  estimatedCost?: number;
  isInPantry: boolean;
  userMarkedHave: boolean;
}

export interface ShoppingList {
  weeklyPlanId: string;
  items: ShoppingListItem[];
  totalEstimatedCost?: number;
}

export interface UserProfile {
  age?: number;
  heightCm?: number;
  weightKg?: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active';
  dietType:
    | 'none'
    | 'halal'
    | 'vegan'
    | 'vegetarian'
    | 'keto'
    | 'gluten_free'
    | 'lactose_free';
  recipeDifficulty: 'super_easy' | 'easy' | 'medium' | 'hard';
  portionMode: 'cutting' | 'maintenance' | 'bulking';
  weeklyBudgetGbp?: number;
  enableBreakfast: boolean;
  enableSnacks: boolean;
  enableLunch: boolean;
  enableDinner: boolean;
}

export interface UserPreferences {
  ingredientsPreferred: string[];
  ingredientsAvoid: string[];
  mustHaveIngredients: string[];
  recipesPreferred: string[];
  cuisinesLiked: string[];
  cuisinesDisliked: string[];
}

export interface UserState {
  id: string;
  profile: UserProfile;
  preferences: UserPreferences;
  pantry: { ingredientId: string; quantity: number; quantityUnit: string }[];
  ingredientOverrides: Record<string, number>;
  lastPlanId?: string;
}

export interface PlannerResponse {
  plan: WeeklyPlan;
  shoppingList: ShoppingList;
  validation: {
    valid: boolean;
    issues: string[];
  };
}

export interface ReviewInstruction {
  targetLevel: 'week' | 'day' | 'meal' | 'ingredient';
  targetIds?: {
    weeklyPlanId?: string;
    planDayId?: string;
    planMealId?: string;
    ingredientId?: string;
  };
  action:
    | 'generate_new_week'
    | 'regenerate_week'
    | 'regenerate_day'
    | 'regenerate_meal'
    | 'swap_ingredient'
    | 'remove_ingredient';
  params?: {
    ingredientToRemove?: string;
    ingredientToAdd?: string;
    applyToWholeWeek?: boolean;
    makeHealthier?: boolean;
    makeCheaper?: boolean;
    makeHigherProtein?: boolean;
    easierDifficulty?: boolean;
    preferMealType?: 'drinkable' | 'solid';
    keepCaloriesSimilar?: boolean;
  };
}
