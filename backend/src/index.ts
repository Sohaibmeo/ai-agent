import express from "express";
import cors from "cors";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { userRouter } from "./routes/userRoutes.js";
import { recipeRouter } from "./routes/recipeRoutes.js";
import { planRouter } from "./routes/planRoutes.js";
import { initDb, pool } from "./lib/db.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/health", healthRouter);
app.use("/api/users", userRouter);
app.use("/api/recipes", recipeRouter);
app.use("/api/plans", planRouter);

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

let server: ReturnType<typeof app.listen> | null = null;

initDb()
  .then(() => {
    server = app.listen(env.PORT, () => {
      console.log(`Backend API ready on port ${env.PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialise database", error);
    process.exit(1);
  });

const shutdown = async () => {
  await pool.end();
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
