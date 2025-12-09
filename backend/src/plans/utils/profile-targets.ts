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

export const PROTEIN_MULTIPLIERS: Record<string, number> = {
  maintain_weight: 1.6,
  lose_weight: 1.8,
  maintain_weight_gain_muscle: 1.9,
  lose_weight_gain_muscle: 2.0,
  gain_weight: 1.7,
  gain_weight_gain_muscle: 1.8,
};

// Simplified calculator based on common heuristics; can be refined later.
export function calculateTargets(profile: ProfileInputs): Targets {
  const weight = profile.weight_kg ?? 70;
  const height = profile.height_cm ?? 175;
  const age = profile.age ?? 25;
  const activity = profile.activity_level ?? 'moderate';
  const goal = profile.goal ?? 'maintain_weight';

  // Mifflin-St Jeor estimation for BMR
  const bmr = 10 * weight + 6.25 * height - 5 * age + 5; // male-ish default

  const tdee = bmr * (ACTIVITY_MULTIPLIER[activity] ?? 1.55);

  const intensity = (profile.goal_intensity || 'moderate').toLowerCase();

  const cutDelta = CUT_MAP[intensity] ?? -300;
  const surplusDelta = SURPLUS_MAP[intensity] ?? 300;

  let calorieDelta = 0;
  if (goal === 'lose_weight' || goal === 'lose_weight_gain_muscle') {
    calorieDelta = cutDelta;
  } else if (goal === 'gain_weight' || goal === 'gain_weight_gain_muscle') {
    calorieDelta = surplusDelta;
  } else if (goal === 'maintain_weight_gain_muscle') {
    // gentle surplus for recomposition
    calorieDelta = Math.round(surplusDelta / 2);
  } else {
    calorieDelta = 0;
  }

  let dailyCalories = tdee + calorieDelta;
  // guard rails
  dailyCalories = Math.max(1200, dailyCalories);

  const proteinPerKg = PROTEIN_MULTIPLIERS[goal] ?? 1.6;
  const dailyProtein = weight * proteinPerKg;

  return {
    dailyCalories: Math.round(dailyCalories),
    dailyProtein: Math.round(dailyProtein),
    maintenanceCalories: Math.round(tdee),
    calorieDelta: Math.round(calorieDelta),
  };
}
