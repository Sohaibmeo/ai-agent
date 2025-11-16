import express from "express";
import cors from "cors";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { planRouter } from "./routes/plan.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", model: env.OLLAMA_MODEL });
});

app.use("/plan", planRouter);

app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (err instanceof ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: err.issues });
    }

    const message = err instanceof Error ? err.message : "Unexpected error";
    res.status(500).json({ message });
  },
);

app.listen(env.AGENT_PORT, () => {
  console.log(`Agent service running on port ${env.AGENT_PORT}`);
});
