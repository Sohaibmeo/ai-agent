import { MacroTargets } from "../types/plan.js";

const activityMultipliers: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  "very-active": 1.9,
};

const goalAdjustments: Record<string, number> = {
  LOSE_FAT: -450,
  MAINTAIN: 0,
  GAIN_MUSCLE: 300,
};

export function calculateBMI(weightKg: number, heightCm: number) {
  const meters = heightCm / 100;
  return +(weightKg / (meters * meters)).toFixed(2);
}

export function calculateBMR(weightKg: number, heightCm: number, age: number) {
  // Mifflin-St Jeor (male-leaning baseline)
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
}

export function estimateTDEE(
  weightKg: number,
  heightCm: number,
  age: number,
  activityLevel: string,
) {
  const bmr = calculateBMR(weightKg, heightCm, age);
  const multiplier = activityMultipliers[activityLevel] ?? activityMultipliers.moderate;
  return Math.round(bmr * multiplier);
}

export function deriveMacroTargets(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: string;
  goal: string;
}): MacroTargets {
  const tdee = estimateTDEE(
    params.weightKg,
    params.heightCm,
    params.age,
    params.activityLevel,
  );
  const adjustment = goalAdjustments[params.goal] ?? 0;
  const calories = tdee + adjustment;
  const proteinGrams = Math.round(params.weightKg * (params.goal === "GAIN_MUSCLE" ? 2.2 : 1.8));
  const fatsGrams = Math.round((calories * 0.25) / 9);
  const carbsGrams = Math.round((calories - (proteinGrams * 4 + fatsGrams * 9)) / 4);

  return {
    calories,
    proteinGrams,
    fatsGrams,
    carbsGrams,
  };
}
