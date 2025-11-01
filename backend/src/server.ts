import express from "express";
import cors from "cors";
import { runPipeline, buildResponse } from "./pipeline";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" })); // expects { csv: "..." }

function periodToDays(p?: string) {
  if (!p) return { days: 7, label: "week" };
  const norm = p.toLowerCase();
  if (norm === "month" || norm === "monthly") return { days: 30, label: "month" };
  return { days: 7, label: "week" };
}

function parseGoal(input: unknown, fallback: number) {
  const n = Number(input);
  return Number.isFinite(n) ? n : fallback;
}

function parseVerbose(hint: unknown) {
  return typeof hint === "boolean"
    ? hint
    : typeof hint === "number"
      ? hint > 0
      : typeof hint === "string"
        ? ["1", "true", "yes", "on"].includes(hint.toLowerCase())
        : false;
}

app.post("/analyze", async (req, res) => {
  try {
    const csv: string = req.body?.csv ?? "";
    if (!csv.trim()) return res.status(400).json({ error: "csv is required in JSON body" });

    const period = String(req.query.period ?? req.body?.period ?? process.env.TIME_WINDOW ?? "week");
    const { days, label } = periodToDays(period);
    const defaultGoal = label === "month" ? 120 : 30;
    const goal = parseGoal(req.query.goal ?? req.body?.goal ?? process.env.GOAL, defaultGoal);

    const state = await runPipeline({
      csv,
      goal,
      timeWindowDays: days,
      periodLabel: label,
    });

    const verboseHint = req.query.verbose ?? req.body?.verbose ?? req.headers["x-verbose"];
    const verbose = parseVerbose(verboseHint);

    const payload = buildResponse(state, {
      includeTrace: verbose,
    });

    res.json(payload);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message ?? "internal error" });
  }
});

app.post("/analyze/stream", async (req, res) => {
  try {
    const csv: string = req.body?.csv ?? "";
    if (!csv.trim()) {
      res.status(400).json({ error: "csv is required in JSON body" });
      return;
    }

    const period = String(req.query.period ?? req.body?.period ?? process.env.TIME_WINDOW ?? "week");
    const { days, label } = periodToDays(period);
    const defaultGoal = label === "month" ? 120 : 30;
    const goal = parseGoal(req.query.goal ?? req.body?.goal ?? process.env.GOAL, defaultGoal);
    const verbose = true; // stream always includes trace-style outputs

    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const write = (event: unknown) => {
      res.write(`${JSON.stringify(event)}\n`);
    };

    try {
      await runPipeline(
        {
          csv,
          goal,
          timeWindowDays: days,
          periodLabel: label,
        },
        (event) => {
          if (event.type === "complete") {
            const payload = buildResponse(event.result, {
              includeTrace: verbose,
            });
            write({ type: "complete", result: payload });
          } else {
            write(event);
          }
        }
      );
      res.end();
    } catch (err) {
      if (!res.writableEnded) {
        const message = err instanceof Error ? err.message : "internal error";
        write({ type: "error", message });
        res.end();
      }
    }
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message ?? "internal error" });
  }
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`API ready on http://localhost:${PORT}`);
});
