export interface ProfileInputs {
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  activity_level?: string;
  goal?: string;
  goal_intensity?: string;
}

export interface Targets {
  dailyCalories: number;
  dailyProtein: number;
  maintenanceCalories: number;
  calorieDelta: number;
}

// Simplified calculator based on common heuristics; can be refined later.
export function calculateTargets(profile: ProfileInputs): Targets {
  const weight = profile.weight_kg ?? 70;
  const height = profile.height_cm ?? 175;
  const age = profile.age ?? 25;
  const activity = profile.activity_level ?? 'moderate';
  const goal = profile.goal ?? 'maintain_weight';

  // Mifflin-St Jeor estimation for BMR
  const bmr = 10 * weight + 6.25 * height - 5 * age + 5; // male-ish default

  const activityMultiplier: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
  };
  const tdee = bmr * (activityMultiplier[activity] ?? 1.55);

  const intensity = (profile.goal_intensity || 'moderate').toLowerCase();
  const cutMap: Record<string, number> = {
    low: -150,
    mild: -200,
    medium: -300,
    moderate: -300,
    high: -450,
    hard: -450,
    extreme: -600,
  };
  const surplusMap: Record<string, number> = {
    low: 200,
    mild: 250,
    medium: 350,
    moderate: 350,
    high: 500,
    hard: 500,
    extreme: 600,
  };

  const calorieDelta =
    goal === 'lose_weight'
      ? cutMap[intensity] ?? -300
      : goal === 'gain_weight'
        ? surplusMap[intensity] ?? 300
        : 0;

  let dailyCalories = tdee + calorieDelta;
  // guard rails
  dailyCalories = Math.max(1200, dailyCalories);

  // Protein 1.6-2.2 g/kg; pick mid
  const dailyProtein = weight * 1.9;

  return {
    dailyCalories: Math.round(dailyCalories),
    dailyProtein: Math.round(dailyProtein),
    maintenanceCalories: Math.round(tdee),
    calorieDelta: Math.round(calorieDelta),
  };
}
