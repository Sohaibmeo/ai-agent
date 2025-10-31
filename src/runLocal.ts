// src/runLocal.ts
import { graph } from "./graph";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.resolve(__dirname, "../test_data/tx.csv"); // points to projectRoot/test_data/tx.csv
const csv = fs.readFileSync(csvPath, "utf8");

const res = await graph.invoke({ csv, goal: 30 });
console.log(JSON.stringify({ categorized: res.categorized, insights: res.insights, advice: res.advice }, null, 2));
