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

  let dailyCalories = tdee;
  if (goal === 'lose_weight') {
    dailyCalories = tdee * 0.8;
  } else if (goal === 'gain_weight') {
    dailyCalories = tdee * 1.1;
  }

  // Protein 1.6-2.2 g/kg; pick mid
  const dailyProtein = weight * 1.9;

  return {
    dailyCalories: Math.round(dailyCalories),
    dailyProtein: Math.round(dailyProtein),
  };
}
