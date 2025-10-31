import { gbp } from "../lib/format";

export default async function coach(s: any) {
  const period = s.periodLabel ?? "week"; // "week" | "month"
  const goal = typeof s.goal === "number" ? s.goal : (period === "month" ? 120 : 30);

  const wi   = s.insights.whatIf;
  const anom = (s.insights.anomalies || []).sort((a: any, b: any) => b.lastN - a.lastN)[0];
  const sub  = (s.insights.subscriptions || [])[0];

  // Focus priority: what-if > anomaly > subscription
  const focusCategory = wi?.category ?? anom?.category ?? (sub ? "Subscriptions" : undefined);
  const focusLabel =
    focusCategory === "Subscriptions" && sub ? `${sub.merchant}` : focusCategory ?? "spending";

  const obstacle =
    wi?.category
      ? `Biggest opportunity is in ${wi.category}`
      : anom
        ? `Higher-than-usual spend in ${anom.category}`
        : sub
          ? `A recurring ${sub.merchant} charge`
          : `Small daily spends adding up`;

  let action: string;
  if (focusCategory === "Subscriptions" && sub) {
    action = `Pause or downgrade ${sub.merchant} for one ${period}`;
  } else if (focusCategory) {
    action = `Set a strict cap for ${focusLabel} and skip one optional purchase this ${period}`;
  } else {
    action = period === "month" ? `Set a £100 discretionary cap` : `Set a £5/day cap on snacks & coffees`;
  }

  const minDelta = period === "month" ? 10 : 3;
  const why =
    wi?.delta && wi.delta >= minDelta
      ? `Cutting ~${gbp(wi.delta)} this ${period} (e.g., in ${focusLabel}) moves you toward ${gbp(goal)} quickly.`
      : `A single tweak plus a small cap typically frees ~${gbp(goal)} without major sacrifice.`;

  const advice =
`- Goal: Save ${gbp(goal)} this ${period}.
- Obstacle: ${obstacle}.
- Action: ${action}.
- When/Where: Tonight at 8pm on your phone; add a reminder and (if capping) use a small cash envelope.
- Why it helps: ${why}`;

  return { advice };
}
