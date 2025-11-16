import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
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
    "You are a meticulous nutrition and budgeting coach. Craft 7-day plans covering Morning, Pre-workout, Post-workout, Snacks, and Dinner. Keep total cost under budget while hitting calorie/protein targets.",
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

export async function generateWeeklyPlan(payload: AgentRequestPayload) {
  const responseText = await chain.invoke({
    user: JSON.stringify(payload.user),
    macros: JSON.stringify(payload.macros),
    recipes: JSON.stringify(payload.recipes.slice(0, 10)),
  });

  const rawJson = extractJsonBlock(responseText);
  const parsed = agentResponseSchema.parse(JSON.parse(rawJson));
  return parsed;
}
