export type ProfileInputs = {
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  activity_level?: string;
  goal?: string;
  goal_intensity?: string;
};

export const ACTIVITY_MULTIPLIER: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

export const CUT_MAP: Record<string, number> = {
  low: -150,
  mild: -200,
  medium: -300,
  moderate: -300,
  high: -450,
  hard: -450,
  extreme: -600,
};

export const SURPLUS_MAP: Record<string, number> = {
  low: 200,
  mild: 250,
  medium: 350,
  moderate: 350,
  high: 500,
  hard: 500,
  extreme: 600,
};

export function calculateTargets(profile: ProfileInputs) {
  const weight = profile.weight_kg ?? 70;
  const height = profile.height_cm ?? 175;
  const age = profile.age ?? 25;
  const activity = profile.activity_level ?? 'moderate';
  const goal = profile.goal ?? 'maintain_weight';
  const intensity = (profile.goal_intensity || 'moderate').toLowerCase();

  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  const tdee = bmr * (ACTIVITY_MULTIPLIER[activity] ?? 1.55);

  const calorieDelta =
    goal === 'lose_weight' || goal === 'lose_weight_gain_muscle'
      ? CUT_MAP[intensity] ?? -300
      : goal === 'gain_weight' || goal === 'gain_weight_gain_muscle'
        ? SURPLUS_MAP[intensity] ?? 300
        : 0;

  let dailyCalories = tdee + calorieDelta;
  dailyCalories = Math.max(1200, dailyCalories);
  const dailyProtein = weight * 1.9;

  return {
    dailyCalories: Math.round(dailyCalories),
    dailyProtein: Math.round(dailyProtein),
    maintenanceCalories: Math.round(tdee),
    calorieDelta: Math.round(calorieDelta),
  };
}
