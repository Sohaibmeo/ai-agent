import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AGENT_SERVICE_URL: z
    .string()
    .url()
    .default("http://localhost:4001"),
});

export const env = envSchema.parse({
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  AGENT_SERVICE_URL: process.env.AGENT_SERVICE_URL,
});
