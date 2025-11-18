import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { env } from "../config/env.js";
import { extractJsonBlock } from "../utils/json.js";
import { AgentRequestPayload, agentResponseSchema, normalizeAgentResponse, safeJsonParse } from "./planSchemas.js";

const coachPrompt = ChatPromptTemplate.fromMessages([
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

const chain = coachPrompt.pipe(model).pipe(new StringOutputParser());

export async function generateWeeklyPlan(payload: AgentRequestPayload) {
  const responseText = await chain.invoke({
    user: JSON.stringify(payload.user),
    macros: JSON.stringify(payload.macros),
    recipes: JSON.stringify(payload.recipes.slice(0, 10)),
  });

  const rawJson = extractJsonBlock(responseText);
  const repaired = safeJsonParse(rawJson);
  const normalized = normalizeAgentResponse(repaired);
  const parsed = agentResponseSchema.parse(normalized);
  return parsed;
}
