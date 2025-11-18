import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { env } from "../config/env.js";
import { extractJsonBlock } from "../utils/json.js";
import {
  agentResponseSchema,
  normalizeAgentResponse,
  safeJsonParse,
  type AgentPlanResponse,
} from "./planSchemas.js";

const reviewPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    [
      "You are a meticulous review agent that adjusts existing weekly meal plans based on user feedback.",
      "You must keep totals close to macro targets and respect dietary rules.",
      "Respond with strict JSON containing two fields: rationale (string) and updatedPlan (same schema as the coach agent output).",
    ].join(" "),
  ],
  [
    "human",
    [
      "Current plan: {plan}\n",
      "User request: {request}\n",
    ].join(""),
  ],
]);

const model = new ChatOllama({
  model: env.OLLAMA_MODEL,
  baseUrl: env.OLLAMA_BASE_URL,
  temperature: 0.1,
});

const reviewChain = reviewPrompt.pipe(model).pipe(new StringOutputParser());

const reviewResponseSchema = z.object({
  rationale: z.string(),
  updatedPlan: agentResponseSchema,
});

export async function reviewWeeklyPlan(input: { plan: AgentPlanResponse; request: string }) {
  const responseText = await reviewChain.invoke({
    plan: JSON.stringify(input.plan),
    request: input.request,
  });
  const rawJson = extractJsonBlock(responseText);
  const repaired = await safeJsonParse(rawJson);
  const normalizedPlan = normalizeAgentResponse(repaired.updatedPlan ?? repaired.plan ?? repaired);
  const fallbackDays = input.plan.days ?? [];
  const mergedDays = normalizedPlan.days.map((day, idx) => {
    if (day.meals.length === 0 && fallbackDays[idx]) {
      return fallbackDays[idx];
    }
    return day;
  });
  while (mergedDays.length < fallbackDays.length) {
    mergedDays.push(fallbackDays[mergedDays.length]);
  }
  const planWithFallback = {
    ...normalizedPlan,
    totals: {
      calories: normalizedPlan.totals.calories || input.plan.totals.calories,
      protein: normalizedPlan.totals.protein || input.plan.totals.protein,
      costCents: normalizedPlan.totals.costCents || input.plan.totals.costCents,
    },
    days: mergedDays,
  };
  return reviewResponseSchema.parse({
    rationale: typeof repaired.rationale === "string" ? repaired.rationale : "Applied requested changes.",
    updatedPlan: planWithFallback,
  });
}
