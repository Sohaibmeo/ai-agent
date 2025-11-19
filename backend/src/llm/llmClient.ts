import { ChatOpenAI } from '@langchain/openai';

export function createLLM(modelOverride?: string) {
  const model = modelOverride || process.env.LLM_MODEL || 'gpt-5-mini';

  const client = new ChatOpenAI({
    model,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: process.env.LLM_BASE_URL
      ? {
          baseURL: process.env.LLM_BASE_URL,
        }
      : undefined,
  });

  return client;
}
