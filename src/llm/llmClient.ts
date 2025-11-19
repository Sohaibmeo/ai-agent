import { ChatOpenAI } from '@langchain/openai';

type LLMOptions = {
  temperature?: number;
};

export function createLLM(options: LLMOptions = {}) {
  return new ChatOpenAI({
    model: process.env.LLM_MODEL ?? 'gpt-4.1-mini',
    temperature: options.temperature ?? 0.4,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: process.env.LLM_BASE_URL
      ? {
          baseURL: process.env.LLM_BASE_URL,
        }
      : undefined,
  });
}
