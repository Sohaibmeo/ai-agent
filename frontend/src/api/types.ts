export interface UserProfile {
  user_id: string;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  activity_level?: string | null;
  goal?: string | null;
  goal_intensity?: string | null;
  diet_type?: string | null;
  allergy_keys?: string[] | null;
  breakfast_enabled?: boolean;
  snack_enabled?: boolean;
  lunch_enabled?: boolean;
  dinner_enabled?: boolean;
  max_difficulty?: string | null;
  weekly_budget_gbp?: number | null;
}

export interface Recipe {
  id: string;
  name: string;
  meal_slot: string;
  meal_type?: string;
  base_kcal?: number | null;
  base_cost_gbp?: number | null;
}

export interface PlanMeal {
  id: string;
  meal_slot: string;
  meal_kcal?: number | null;
  meal_cost_gbp?: number | null;
  recipe?: Recipe;
}

export interface PlanDay {
  id: string;
  day_index: number;
  daily_kcal?: number | null;
  daily_cost_gbp?: number | null;
  meals: PlanMeal[];
}

export interface WeeklyPlan {
  id: string;
  week_start_date: string;
  status: string;
  total_estimated_cost_gbp?: number | null;
  total_kcal?: number | null;
  days: PlanDay[];
}

export interface ShoppingListItem {
  id: string;
  ingredient: { id: string; name: string };
  total_quantity: number;
  unit: string;
  estimated_cost_gbp?: number | null;
  has_item?: boolean;
}

export interface ShoppingList {
  weekly_plan_id: string;
  items: ShoppingListItem[];
}
