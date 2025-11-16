import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { jsonrepair } from "jsonrepair";
import { z } from "zod";
import { env } from "../config/env.js";
import { extractJsonBlock } from "../utils/json.js";

const dayMealSchema = z.object({
  name: z.string(),
  mealType: z.string(),
  calories: z.number(),
  protein: z.number(),
  costCents: z.number(),
  notes: z.string().optional(),
});

const dayPlanSchema = z.object({
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

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    [
      "You are a meticulous nutrition and budgeting coach.",
      "Craft exactly 7 daily entries (Day 1 ... Day 7). Each day must include 4-5 meals (Morning, Pre-workout, Post-workout, Snacks, Dinner).",
      "Keep total cost under budget while hitting calorie/protein targets.",
      "Respond with pure JSON only, no markdown, no commentary.",
      "JSON schema: summary (string), agentVersion (string), totals object containing calories (number), protein (number), costCents (number).",
      "Days must be an array, each entry with day (string) and meals (array).",
      "Each meal must include name (string), mealType (Morning/Pre-workout/Post-workout/Snacks/Dinner), calories (number), protein (number), costCents (number), optional notes (string).",
      "All numbers must be numeric types (no strings). costCents should be whole cents. Provide at least 4 meals per day.",
    ].join(" "),
  ],
  [
    "human",
    [
      "User context: {user}\n",
      "Macro targets: {macros}\n",
      "Recipe snippets: {recipes}\n",
      "Return JSON with fields summary, agentVersion, totals, days[].",
    ].join(""),
  ],
]);

const model = new ChatOllama({
  model: env.OLLAMA_MODEL,
  baseUrl: env.OLLAMA_BASE_URL,
  temperature: 0.1,
});

const chain = prompt.pipe(model).pipe(new StringOutputParser());

const toNumber = (value: unknown, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

function normalizeAgentResponse(raw: any) {
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

export async function generateWeeklyPlan(payload: AgentRequestPayload) {
  const responseText = await chain.invoke({
    user: JSON.stringify(payload.user),
    macros: JSON.stringify(payload.macros),
    recipes: JSON.stringify(payload.recipes.slice(0, 10)),
  });

  const rawJson = extractJsonBlock(responseText);
  const repaired = JSON.parse(jsonrepair(rawJson));
  const normalized = normalizeAgentResponse(repaired);
  const parsed = agentResponseSchema.parse(normalized);
  return parsed;
}
