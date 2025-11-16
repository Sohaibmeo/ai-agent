export type MacroTargets = {
  calories: number;
  proteinGrams: number;
  fatsGrams: number;
  carbsGrams: number;
};

export type DayMeal = {
  name: string;
  recipeId?: string;
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

export type AgentPlanResponse = {
  summary: string;
  days: DayPlan[];
  totals: {
    calories: number;
    protein: number;
    costCents: number;
  };
  agentVersion: string;
};

export type AgentPlanRequest = {
  user: {
    id: string;
    name: string;
    email: string;
    weeklyBudgetCents: number;
    dietaryPreferences: string[];
    excludedIngredients: string[];
    fitnessGoal: string;
    activityLevel: string;
  };
  macros: MacroTargets;
  recipes: Array<{
    id: string;
    name: string;
    mealType: string;
    calories: number;
    proteinGrams: number;
    costCents: number;
    dietTags: string[];
  }>;
};
