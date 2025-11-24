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
