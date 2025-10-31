import { round2 } from "../lib/format";

export default async function insightsJoin(s: any) {
  const totals: Record<string, number> = {};
  for (const r of s.categorized) {
    totals[r.category] = (totals[r.category] ?? 0) + r.amount;
  }

  // round everything to 2 dp for stable UI/math
  const totalsRounded = Object.fromEntries(
    Object.entries(totals).map(([k, v]) => [k, round2(v)])
  );

  return {
    insights: {
      totalsByCategory: totalsRounded,
      subscriptions: s.subOut ?? [],
      anomalies: s.anomOut ?? [],
      whatIf: s.whatIfOut
    }
  };
}
