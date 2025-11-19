import { StructuredOutputParser } from 'langchain/output_parsers';

import { createLLM } from './llmClient.js';
import {
  GenerateWeekInput,
  ReviewInstruction,
  WeeklyPlan,
  WeeklyPlanSchema,
} from './schemas.js';

const parser = StructuredOutputParser.fromZodSchema(WeeklyPlanSchema);
const formatInstructions = parser.getFormatInstructions();

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

async function invokeCoachLLM(args: CoachAgentArgs, retryHint?: string) {
  const model = process.env.COACH_MODEL || 'gpt-5-mini';
  const llm = createLLM(model);
  const instructions = [
    'You are the Coach Agent for a UK budget-aware meal planner. Produce a 7-day WeeklyPlan JSON strictly following the schema.',
    formatInstructions,
    'Hard requirements:',
    '- Exactly 7 days starting at weekStartDate with sequential dayIndex 0-6.',
    '- Populate meals only for enabled meal schedule slots.',
    '- Use only recipes/ingredients from catalog; adjust costs/macros by portionMultiplier.',
    '- Numeric fields must be plain numbers (no strings).',
    retryHint ? `Previous output was invalid: ${retryHint}. Respond with JSON only.` : 'Respond with JSON only, no prose.',
    '',
    `Mode: ${args.mode}`,
    `Generate input JSON: ${JSON.stringify(args.generateInput ?? null)}`,
    `Current plan JSON: ${JSON.stringify(args.currentPlan ?? null)}`,
    `Review instruction JSON: ${JSON.stringify(args.instruction ?? null)}`,
    `Catalog JSON (trimmed): ${JSON.stringify(args.catalog)}`,
  ].join('\n');
  const llmResponse = await llm.invoke(instructions);
  logUsage('coach', llmResponse, model);
  return messageContentToString(llmResponse.content);
}

export async function runCoachAgent(args: CoachAgentArgs): Promise<WeeklyPlan> {
  let lastError: unknown;
  for (const retryHint of [undefined, 'Return valid WeeklyPlan JSON exactly as specified']) {
    const text = await invokeCoachLLM(args, retryHint);
    try {
      const parsed = await parser.parse(text);
      return WeeklyPlanSchema.parse(parsed);
    } catch (error) {
      console.error('Coach agent output parsing failed', { error, rawOutput: text });
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Coach agent failed to produce valid plan');
}
