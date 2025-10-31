import express from "express";
import cors from "cors";
import { graph } from "./graph";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" })); // expects { csv: "..." }

function periodToDays(p?: string) {
  if (!p) return { days: 7, label: "week" };
  const norm = p.toLowerCase();
  if (norm === "month" || norm === "monthly") return { days: 30, label: "month" };
  return { days: 7, label: "week" };
}

app.post("/analyze", async (req, res) => {
  try {
    const csv: string = req.body?.csv ?? "";
    if (!csv.trim()) return res.status(400).json({ error: "csv is required in JSON body" });

    const goal = Number(req.query.goal ?? req.body?.goal ?? process.env.GOAL ?? 30);
    const period = String(req.query.period ?? req.body?.period ?? process.env.TIME_WINDOW ?? "week");
    const { days, label } = periodToDays(period);

    const out = await graph.invoke({
      csv,
      goal,
      timeWindowDays: days,
      periodLabel: label,
    });

    const verboseHint = req.query.verbose ?? req.body?.verbose ?? req.headers["x-verbose"];
    const verbose =
      typeof verboseHint === "boolean"
        ? verboseHint
        : typeof verboseHint === "number"
          ? verboseHint > 0
          : typeof verboseHint === "string"
            ? ["1", "true", "yes", "on"].includes(verboseHint.toLowerCase())
            : false;

    const payload: Record<string, unknown> = {
      period: label,
      timeWindowDays: days,
      goal,
      categorized: out.categorized,
      insights: out.insights,
      advice: out.advice,
    };

    if (verbose) {
      payload.trace = {
        csv,
        rows: out.rows,
        ruleCats: out.ruleCats,
        nerCats: out.nerCats,
        subOut: out.subOut,
        anomOut: out.anomOut,
        whatIfOut: out.whatIfOut,
      };
    }

    res.json(payload);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message ?? "internal error" });
  }
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`API ready on http://localhost:${PORT}`);
});
