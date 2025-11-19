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

function logUsage(agent: string, message: unknown, defaultModel: string) {
  const usage = (message as { usageMetadata?: { inputTokens?: number; outputTokens?: number } }).usageMetadata;
  const responseMetadata = (message as { response_metadata?: { model?: string } }).response_metadata;
  if (!usage) return;
  console.log('LLM usage', {
    agent,
    model: responseMetadata?.model ?? defaultModel,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
  });
}

export async function runReviewAgent(args: {
  actionContext: PlanActionContext;
  reasonText?: string;
  currentPlan: WeeklyPlan;
  profileSnippet: Record<string, unknown>;
}): Promise<ReviewInstruction> {
  const model = process.env.REVIEW_MODEL || 'gpt-5-nano';
  const llm = createLLM(model);
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
  logUsage('review', llmResponse, model);
  const text = messageContentToString(llmResponse.content);
  try {
    const parsed = await parser.parse(text);
    return ReviewInstructionSchema.parse(parsed);
  } catch (error) {
    console.error('Review agent output parsing failed', { error, rawOutput: text });
    throw error;
  }
}
