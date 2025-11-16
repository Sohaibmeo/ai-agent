export type FitnessGoal = "LOSE_FAT" | "MAINTAIN" | "GAIN_MUSCLE";

export type UserProfilePayload = {
  id?: string;
  name: string;
  email: string;
  heightCm: number;
  weightKg: number;
  age: number;
  activityLevel: string;
  weeklyBudget: number;
  dietaryPreferences: string[];
  excludedIngredients: string[];
  fitnessGoal: FitnessGoal;
};

export type DayMeal = {
  name: string;
  mealType: string;
  calories: number;
  protein: number;
  costCents: number;
  notes?: string;
};

export type DayPlan = {
  day: string;
  meals: DayMeal[];
};

export type WeeklyPlanResponse = {
  plan: {
    id: string;
    summary: string;
    planJson: DayPlan[];
    totalCalories: number;
    totalProtein: number;
    totalCostCents: number;
    createdAt: string;
  };
  macros: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
  };
};

export type PlanRecord = WeeklyPlanResponse["plan"];
