import { StructuredOutputParser } from 'langchain/output_parsers';

import { createLLM } from './llmClient.js';
import {
  GenerateWeekInput,
  ReviewInstruction,
  WeeklyPlan,
  WeeklyPlanSchema,
} from './schemas.js';

const parser = StructuredOutputParser.fromZodSchema(WeeklyPlanSchema);

export interface CoachAgentArgs {
  mode: 'generate' | 'regenerate';
  generateInput?: GenerateWeekInput;
  currentPlan?: WeeklyPlan;
  instruction?: ReviewInstruction;
  catalog: GenerateWeekInput['catalog'];
}

function messageContentToString(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((chunk) => {
        if (typeof chunk === 'string') return chunk;
        if (typeof chunk === 'object' && chunk && 'text' in chunk && typeof chunk.text === 'string') {
          return chunk.text;
        }
        return '';
      })
      .join('')
      .trim();
  }
  return '';
}

function logUsage(agent: string, message: unknown, defaultModel: string) {
  const usage = (message as { usageMetadata?: { inputTokens?: number; outputTokens?: number } }).usageMetadata;
  const responseMetadata = (message as { response_metadata?: { model?: string } }).response_metadata;
  if (!usage) {
    return;
  }
  console.log('LLM usage', {
    agent,
    model: responseMetadata?.model ?? defaultModel,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
  });
}

export async function runCoachAgent(args: CoachAgentArgs): Promise<WeeklyPlan> {
  const model = process.env.COACH_MODEL || 'gpt-5-mini';
  const llm = createLLM(model);
  const prompt = [
    'You are the Coach Agent for a UK budget-aware meal planner.',
    'Return ONLY JSON that satisfies the WeeklyPlan schema (7 days, meals respecting meal schedule, budgets, diets).',
    'Use only catalog recipes/ingredients provided.',
    '',
    `Mode: ${args.mode}`,
    `Generate input: ${JSON.stringify(args.generateInput ?? null)}`,
    `Current plan: ${JSON.stringify(args.currentPlan ?? null)}`,
    `Review instruction: ${JSON.stringify(args.instruction ?? null)}`,
    `Catalog: ${JSON.stringify(args.catalog)}`,
  ].join('\n');
  const llmResponse = await llm.invoke(prompt);
  logUsage('coach', llmResponse, model);
  const text = messageContentToString(llmResponse.content);
  try {
    const parsed = await parser.parse(text);
    return WeeklyPlanSchema.parse(parsed);
  } catch (error) {
    console.error('Coach agent output parsing failed', { error, rawOutput: text });
    throw error;
  }
}
