import { config } from "dotenv";
import { z } from "zod";

config();

const schema = z.object({
  AGENT_PORT: z.coerce.number().default(4001),
  OLLAMA_MODEL: z.string().default("llama3:latest"),
  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
});

export const env = schema.parse({
  AGENT_PORT: process.env.AGENT_PORT,
  OLLAMA_MODEL: process.env.OLLAMA_MODEL,
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
});
