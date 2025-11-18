export type FitnessGoal = "LOSE_FAT" | "MAINTAIN" | "GAIN_MUSCLE" | "RECOMP";
export type WorkoutFrequency = "1-2" | "3-4" | "5-6" | "7+";

export type FavouriteMeal = {
  name: string;
  calories?: number;
  proteinGrams?: number;
  costCents?: number;
};

export type UserProfilePayload = {
  id?: string;
  name: string;
  email: string;
  region: "UK";
  heightCm: number;
  weightKg: number;
  age: number;
  activityLevel: string;
  workoutFrequency: WorkoutFrequency;
  goal: FitnessGoal;
  weeklyBudget: number;
  dietaryPreferences: string[];
  excludedIngredients: string[];
  favouriteMeals: FavouriteMeal[];
  mealUpload?: {
    type: "text" | "file";
    content: string;
  };
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

export type PlanReviewPayload = {
  planId: string;
  userId: string;
  requestText: string;
};
