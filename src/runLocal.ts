import { graph } from "./graph";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1) Resolve CSV_PATH (absolute from CWD), then fall back to common locations, else embed sample.
function resolveCsv(): { csv: string; pathUsed: string } {
  const envPath = process.env.CSV_PATH
    ? path.resolve(process.cwd(), process.env.CSV_PATH)
    : null;

  if (envPath && fs.existsSync(envPath)) {
    const csv = fs.readFileSync(envPath, "utf8");
    return { csv, pathUsed: envPath };
  }

  // fallbacks
  const candidates = [
    path.resolve(process.cwd(), "test_data/tx.csv"),
    path.resolve(__dirname, "../test_data/tx.csv"),
    path.resolve(__dirname, "./test_data/tx.csv"),
  ];
  const found = candidates.find(p => fs.existsSync(p));

  if (found) {
    const csv = fs.readFileSync(found, "utf8");
    return { csv, pathUsed: found };
  }

  // last resort: embedded sample
  const embedded = `date,description,amount
2025-10-01,Salary,1200.00
2025-10-03,Tesco Superstore,-32.40
2025-10-04,Uber Trip,-11.20
2025-10-05,Spotify,-9.99
2025-10-06,Starbucks,-4.20
2025-10-31,Spotify,-9.99
`;
  return { csv: embedded, pathUsed: "(embedded sample)" };
}

// 2) Period/goal from env
const tw = (process.env.TIME_WINDOW || "week").toLowerCase();
const timeWindowDays = tw === "month" ? 30 : 7;
const periodLabel = tw === "month" ? "month" : "week";
const goal = Number(process.env.GOAL || (periodLabel === "month" ? 120 : 30));

// 3) Load CSV and run
const { csv, pathUsed } = resolveCsv();
const res = await graph.invoke({ csv, goal, timeWindowDays, periodLabel });

// 4) Print which CSV was used so you can sanity-check runs
console.log(JSON.stringify({
  period: periodLabel,
  csv: pathUsed,
  categorized: res.categorized,
  insights: res.insights,
  advice: res.advice
}, null, 2));
