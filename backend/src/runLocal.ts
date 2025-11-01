import { runPipeline, buildResponse } from "./pipeline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESM dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveCsv(): { csv: string; pathUsed: string } {
  const envPath = process.env.CSV_PATH
    ? path.resolve(process.cwd(), process.env.CSV_PATH)
    : null;

  if (envPath && fs.existsSync(envPath)) {
    return { csv: fs.readFileSync(envPath, "utf8"), pathUsed: envPath };
  }

  const candidates = [
    path.resolve(process.cwd(), "test_data/tx.csv"),
    path.resolve(__dirname, "../test_data/tx.csv"),
    path.resolve(__dirname, "./test_data/tx.csv"),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (found) return { csv: fs.readFileSync(found, "utf8"), pathUsed: found };

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

function periodToDays(p?: string) {
  if (!p) return { days: 7, label: "week" };
  const norm = p.toLowerCase();
  if (norm === "month" || norm === "monthly") return { days: 30, label: "month" };
  return { days: 7, label: "week" };
}

// ENV -> params
const period = String(process.env.TIME_WINDOW ?? "week");
const { days, label } = periodToDays(period);
const goal = Number(process.env.GOAL ?? (label === "month" ? 120 : 30));

// Load CSV and run pipeline
const { csv, pathUsed } = resolveCsv();
const state = await runPipeline({
  csv,
  goal,
  timeWindowDays: days,
  periodLabel: label,
});

// Build response payload with optional verbose trace
const verboseFlag = String(process.env.VERBOSE ?? "0").toLowerCase();
const isVerbose = verboseFlag === "1" || verboseFlag === "true";

const payload = buildResponse(state, {
  csvPath: pathUsed,
  includeTrace: isVerbose,
});

console.log(JSON.stringify(payload, null, 2));
