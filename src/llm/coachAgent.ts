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

export async function runCoachAgent(args: CoachAgentArgs): Promise<WeeklyPlan> {
  const llm = createLLM({ temperature: args.mode === 'generate' ? 0.5 : 0.2 });
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
  const text = messageContentToString(llmResponse.content);
  const parsed = await parser.parse(text);
  return WeeklyPlanSchema.parse(parsed);
}
