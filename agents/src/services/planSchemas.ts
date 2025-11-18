import { z } from "zod";
import { env } from "../config/env.js";

export const dayMealSchema = z.object({
  name: z.string(),
  mealType: z.string(),
  calories: z.number(),
  protein: z.number(),
  costCents: z.number(),
  notes: z.string().optional(),
});

export const dayPlanSchema = z.object({
  day: z.string(),
  meals: z.array(dayMealSchema),
});

export const agentResponseSchema = z.object({
  summary: z.string(),
  agentVersion: z.string(),
  totals: z.object({
    calories: z.number(),
    protein: z.number(),
    costCents: z.number(),
  }),
  days: z.array(dayPlanSchema).min(3),
});

export type AgentPlanResponse = z.infer<typeof agentResponseSchema>;

export type AgentRequestPayload = {
  user: {
    id: string;
    name: string;
    weeklyBudgetCents: number;
    dietaryPreferences: string[];
    excludedIngredients: string[];
    fitnessGoal: string;
    activityLevel: string;
  };
  macros: {
    calories: number;
    proteinGrams: number;
    fatsGrams: number;
    carbsGrams: number;
  };
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

const toNumber = (value: unknown, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export const safeJsonParse = async (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text.replace(/\/\/.*$/gm, "");
    try {
      return JSON.parse(cleaned);
    } catch {
      const { jsonrepair } = await import("jsonrepair");
      return JSON.parse(jsonrepair(text));
    }
  }
};

export function normalizeAgentResponse(raw: any): AgentPlanResponse {
  const summary =
    typeof raw?.summary === "string"
      ? raw.summary
      : raw?.summary
        ? JSON.stringify(raw.summary)
        : "Weekly plan";
  const totals = raw?.totals ?? {};
  const normalizedDays =
    Array.isArray(raw?.days) && raw.days.length > 0
      ? raw.days.map((day: any, index: number) => {
          const meals = Array.isArray(day?.meals) ? day.meals : [];
          return {
            day: typeof day?.day === "string" ? day.day : `Day ${index + 1}`,
            meals: meals.map((meal: any, mealIdx: number) => ({
              name: typeof meal?.name === "string" ? meal.name : `Meal ${mealIdx + 1}`,
              mealType: typeof meal?.mealType === "string" ? meal.mealType : "meal",
              calories: toNumber(meal?.calories ?? meal?.kcal),
              protein: toNumber(meal?.protein ?? meal?.proteinGrams),
              costCents: toNumber(meal?.costCents ?? meal?.cost ?? 0),
              notes: typeof meal?.notes === "string" ? meal.notes : undefined,
            })),
          };
        })
      : [];

  while (normalizedDays.length < 3) {
    normalizedDays.push({
      day: `Day ${normalizedDays.length + 1}`,
      meals: [],
    });
  }

  return {
    summary,
    agentVersion: typeof raw?.agentVersion === "string" ? raw.agentVersion : `ollama-${env.OLLAMA_MODEL}`,
    totals: {
      calories: toNumber(totals.calories),
      protein: toNumber(totals.protein ?? totals.proteinGrams),
      costCents: toNumber(totals.costCents ?? totals.cost ?? 0),
    },
    days: normalizedDays,
  };
}
