import { StructuredOutputParser } from 'langchain/output_parsers';

import { createLLM } from './llmClient.js';
import { PlanActionContext, ReviewInstruction, ReviewInstructionSchema, WeeklyPlan } from './schemas.js';

const parser = StructuredOutputParser.fromZodSchema(ReviewInstructionSchema);

function messageContentToString(content: unknown): string {
  if (typeof content === 'string') return content;
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

export async function runReviewAgent(args: {
  actionContext: PlanActionContext;
  reasonText?: string;
  currentPlan: WeeklyPlan;
  profileSnippet: Record<string, unknown>;
}): Promise<ReviewInstruction> {
  const llm = createLLM({ temperature: 0.1 });
  const prompt = [
    'Translate the action context + reason into a structured ReviewInstruction for the Coach Agent.',
    'Do not directly modify the plan.',
    '',
    `Action context: ${JSON.stringify(args.actionContext)}`,
    `Reason: ${args.reasonText ?? ''}`,
    `Profile snippet: ${JSON.stringify(args.profileSnippet)}`,
    `Current plan summary: ${JSON.stringify(args.currentPlan)}`,
  ].join('\n');
  const llmResponse = await llm.invoke(prompt);
  const text = messageContentToString(llmResponse.content);
  const parsed = await parser.parse(text);
  return ReviewInstructionSchema.parse(parsed);
}
