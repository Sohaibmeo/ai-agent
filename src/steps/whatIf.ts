import dayjs from "../lib/dayjs";
import { round2 } from "../lib/format";

export default async function whatIf(s: any) {
  if (!s.categorized?.length) return { whatIfOut: undefined };

  const dates = s.categorized
    .map((r: any) => dayjs(r.date))
    .filter((d: any) => d.isValid());
  const now = dates.length ? dayjs.max(dates) : dayjs();
  const last7Start = now.subtract(6, "day");

  // 7-day view
  const spend7: Record<string, number> = {};
  let income7 = 0;
  for (const r of s.categorized) {
    const d = dayjs(r.date);
    if (!d.isAfter(last7Start)) continue;
    if (r.amount < 0) spend7[r.category] = (spend7[r.category] ?? 0) + Math.abs(r.amount);
    else income7 += r.amount;
  }
  const totalSpend7 = Object.values(spend7).reduce((a, b) => a + b, 0);

  // Overall view (fallback if week is too sparse)
  const spendAll: Record<string, number> = {};
  for (const r of s.categorized) {
    if (r.amount < 0) spendAll[r.category] = (spendAll[r.category] ?? 0) + Math.abs(r.amount);
  }

  // Choose source for what-if
  const USE_OVERALL_THRESHOLD = 15; // if < £15 spent this week, use overall totals
  const source = totalSpend7 < USE_OVERALL_THRESHOLD ? spendAll : spend7;

  const top = Object.entries(source).sort((a, b) => b[1] - a[1])[0];
  if (!top) return { whatIfOut: undefined };

  const [category, amt] = top as [string, number];

  // 10% cut with a minimum practical delta
  const MIN_DELTA = 3;
  const computed = round2(amt * 0.10);
  const delta = Math.max(MIN_DELTA, computed);

  // Free-to-spend only meaningful for last-7 view; if we used overall, leave it based on week’s baseline
  const newFreeToSpend = round2(income7 - (totalSpend7 - (source === spend7 ? delta : 0)));

  return { whatIfOut: { category, cutPct: 10, delta: round2(delta), newFreeToSpend } };
}
