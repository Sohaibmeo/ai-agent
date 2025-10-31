import { gbp } from "../lib/format";

function tipsFor(category: string, merchant?: string, period: "week" | "month" = "week") {
  const t = {
    Subscriptions: [
      `Open ${merchant ?? "the service"} → set reminder to review before next renewal`,
      `Pause/downgrade or switch to family/annual plan if cheaper`,
    ],
    Bills: [
      `Submit a fresh meter reading and check if you're overpaying`,
      `Compare tariffs; consider switching or removing extras this ${period}`,
    ],
    Groceries: [
      `Plan 3 cheap meals; swap 2 branded items to own-label`,
      `Use a list + click-and-collect to avoid impulse buys`,
    ],
    Dining: [
      `Cap takeaway to 1 order; prep 2 quick meals instead`,
      `Use a cash envelope (£5–£10) this ${period}`,
    ],
    Transport: [
      `Batch trips; check weekly cap/railcard; prefer bus/train over ride-hail`,
      `Compare parking vs public transport costs in advance`,
    ],
    Shopping: [
      `Delay non-essentials by 48 hours; remove saved cards to add friction`,
      `Set a single discretionary cap for this ${period}`,
    ],
    Default: [
      `Pick one category to cap and skip one optional purchase`,
      `Set a small reminder tonight to lock the change in`,
    ],
  } as const;

  const key = (category as keyof typeof t) in t ? (category as keyof typeof t) : "Default";
  return t[key].slice(0, 2);
}

export default async function coach(s: any) {
  const period = (s.periodLabel === "month" ? "month" : "week") as "week" | "month";
  const goal = typeof s.goal === "number" ? s.goal : (period === "month" ? 120 : 30);

  const wi   = s.insights.whatIf;
  const anom = (s.insights.anomalies || []).sort((a: any, b: any) => b.lastN - a.lastN)[0];
  const sub  = (s.insights.subscriptions || [])[0];

  // Priority: what-if > anomaly > subscription
  const focusCategory = wi?.category ?? anom?.category ?? (sub ? "Subscriptions" : undefined);
  const merchant = sub?.merchant;

  const obstacle =
    wi?.category
      ? `Biggest opportunity is in ${wi.category}`
      : anom
        ? `Higher-than-usual spend in ${anom.category}`
        : sub
          ? `A recurring ${sub.merchant} charge`
          : `Small daily spends adding up`;

  const minDelta = period === "month" ? 10 : 3;
  const why =
    wi?.delta && wi.delta >= minDelta
      ? `Cutting ~${gbp(wi.delta)} this ${period} (e.g., in ${focusCategory ?? "spending"}) moves you toward ${gbp(goal)} quickly.`
      : `A single tweak plus a small cap typically frees ~${gbp(goal)} without major sacrifice.`;

  const [t1, t2] = tipsFor(focusCategory ?? "Default", merchant, period);

  const advice =
`- Goal: Save ${gbp(goal)} this ${period}.
- Obstacle: ${obstacle}.
- Action: ${t1}.
- Backup action: ${t2}.
- When/Where: Tonight at 8pm on your phone; add a reminder.
- Why it helps: ${why}`;

  return { advice };
}
