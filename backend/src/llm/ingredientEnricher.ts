import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';

import { createLLM } from './llmClient.js';

export const IngredientSuggestionSchema = z.object({
  name: z.string(),
  unit: z.enum(['per_100g', 'per_piece', 'per_serving', 'per_ml']),
  kcalPerUnit: z.number(),
  proteinPerUnit: z.number(),
  carbsPerUnit: z.number(),
  fatPerUnit: z.number(),
  estimatedPricePerUnit: z.number(),
  tags: z.array(z.string()).default([]),
});

export type IngredientSuggestion = z.infer<typeof IngredientSuggestionSchema>;

const parser = StructuredOutputParser.fromZodSchema(IngredientSuggestionSchema);

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

export async function enrichIngredient(description: string) {
  const llm = createLLM();
  const prompt = [
    'Extract nutrition + price info for a UK grocery ingredient/product description.',
    'Return only JSON matching the schema fields.',
    `Description: ${description}`,
  ].join('\n');
  const llmResponse = await llm.invoke(prompt);
  const text = messageContentToString(llmResponse.content);
  const parsed = await parser.parse(text);
  return IngredientSuggestionSchema.parse(parsed);
}
