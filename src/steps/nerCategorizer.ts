import { ollamaGenerate } from "../llm/ollama";
import type { CatRow, Category } from "../types.ts";

const CATS: Category[] = ["Groceries","Dining","Transport","Shopping","Bills","Subscriptions","Entertainment","Health","Education","Travel","Income","Other"];
const MODEL = (process.env.CATEGORIZER_MODEL || "ollama/qwen2.5:3b-instruct").replace(/^ollama\//,"");

export default async function nerCategorizer(s: any) {
  const out: CatRow[] = [];
  for (const r of s.rows) {
    const prompt = `Assign exactly one category from: ${CATS.join(", ")}.
Return JSON exactly as {"category":"...","rationale":"..."} (no extra text).
Merchant/description: "${r.merchant}". Amount: ${r.amount}.`;
    const text = await ollamaGenerate(MODEL, prompt, 128);
    let category: Category = "Other", rationale = "LLM inference";
    try {
      const p = JSON.parse(text);
      if (CATS.includes(p.category)) category = p.category;
      if (p.rationale) rationale = p.rationale;
    } catch { /* keep defaults */ }
    out.push({ ...r, category, source: "llm", rationale, confidence: 0.7 });
  }
  return { nerCats: out };
}
