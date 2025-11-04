import { ollamaGenerate } from "../llm/ollama";
import { gbp } from "../lib/format";

const MODEL = (process.env.COACH_MODEL || "ollama/qwen2.5:3b-instruct").replace(/^ollama\//, "");

export default async function coach(s: any) {
  const period = (s.periodLabel === "month" ? "month" : "week") as "week" | "month";
  const goal = typeof s.goal === "number" ? s.goal : (period === "month" ? 120 : 30);

  const insights = s.insights || {
    totalsByCategory: {},
    subscriptions: [],
    anomalies: [],
    whatIf: undefined,
  };

  // Format insights summary for the LLM
  const topCategories = Object.entries(insights.totalsByCategory || {})
    .filter(([, amount]: [string, any]) => amount < 0)
    .sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number))
    .slice(0, 3)
    .map(([cat, amt]: [string, any]) => `${cat}: ${gbp(amt)}`)
    .join("; ");

  const subscriptionsStr = (insights.subscriptions || [])
    .slice(0, 2)
    .map((s: any) => `${s.merchant} (${gbp(s.avgAmount)}/month)`)
    .join("; ");

  const anomaliesStr = (insights.anomalies || [])
    .slice(0, 2)
    .map((a: any) => `${a.category} spiked to ${gbp(a.lastN)} (median: ${gbp(a.medianPrev)})`)
    .join("; ");

  const whatIfStr = insights.whatIf
    ? `Cutting 10% from ${insights.whatIf.category} saves ~${gbp(insights.whatIf.delta)} this ${period}`
    : "No specific savings target identified";

  const prompt = `You are a behavioral finance coach. Based on the user's spending insights, generate personalized coaching advice.

User goal: Save ${gbp(goal)} this ${period}.
Period: ${period} (${period === "week" ? 7 : 30} days)
Top spending: ${topCategories || "no major spending detected"}
Subscriptions: ${subscriptionsStr || "none detected"}
Anomalies: ${anomaliesStr || "no spending spikes"}
Opportunity: ${whatIfStr}

Output format (required sections with colon):
- Goal: [1-2 sentences on the savings target]
- Obstacle: [1 sentence on the main challenge]
- Action: [A 3-5 step mini-plan they can execute. Use numbered steps (1. ... 2. ... 3. ...)]
- Backup action: [2-3 alternative steps if main plan feels overwhelming]
- When/Where: [specific time and place to start]
- Why it helps: [2 sentences on how this reaches the £${goal} goal]

Be specific, warm, and actionable. Make steps concrete and measurable.`;

  const text = await ollamaGenerate(MODEL, prompt, 512);
  
  // Clean up response - keep all lines that start with a dash or are numbered steps
  const advice = text
    .split("\n")
    .map(line => {
      const trimmed = line.trim();
      // Keep lines that start with dash or are numbered steps
      if (trimmed.startsWith("-") || /^\d+\./.test(trimmed)) {
        return trimmed;
      }
      return null;
    })
    .filter(Boolean)
    .join("\n")
    .trim();

  return { advice: advice || text.trim() };
}
