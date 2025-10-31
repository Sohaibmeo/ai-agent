import { gbp } from "../lib/format";

export default async function coach(s: any) {
  const goal = s.goal ?? 30;
  const wi   = s.insights.whatIf;                         // { category, delta, ... } or undefined
  const anom = (s.insights.anomalies || []).sort((a:any,b:any)=>b.last7-a.last7)[0];
  const sub  = (s.insights.subscriptions || [])[0];

  // 1) Pick primary focus (what-if first, then anomaly, then subscription)
  //    Note: subscriptions use category="Subscriptions" and sub.merchant is available.
  const focusCategory = wi?.category ?? anom?.category ?? (sub ? "Subscriptions" : undefined);
  const focusLabel =
    focusCategory === "Subscriptions" && sub ? `${sub.merchant}` : focusCategory ?? "spending";

  // 2) Obstacle line
  const obstacle =
    wi?.category
      ? `Biggest opportunity is in ${wi.category}`
      : anom
        ? `Higher-than-usual spend in ${anom.category}`
        : sub
          ? `A recurring ${sub.merchant} charge`
          : `Small daily spends adding up`;

  // 3) Action line (tailored to focus)
  let action: string;
  if (focusCategory === "Subscriptions" && sub) {
    action = `Pause or downgrade ${sub.merchant} for one month`;
  } else if (focusCategory) {
    action = `Set a strict cap for ${focusLabel} and skip one optional purchase this week`;
  } else {
    action = `Set a £5/day cap on snacks & coffees`;
  }

  // 4) Why line (use delta if present & meaningful)
  const why =
    wi?.delta && wi.delta >= 3
      ? `Cutting ~${gbp(wi.delta)} in ${focusLabel} this week moves you toward ${gbp(goal)} quickly.`
      : `A single tweak plus a small cap typically frees ~${gbp(goal)} without major sacrifice.`;

  const advice =
`- Goal: Save ${gbp(goal)} this week.
- Obstacle: ${obstacle}.
- Action: ${action}.
- When/Where: Tonight at 8pm on your phone; add a reminder and (if capping) use a small cash envelope.
- Why it helps: ${why}`;

  return { advice };
}
