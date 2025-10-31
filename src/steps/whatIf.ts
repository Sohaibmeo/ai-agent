import dayjs from "../lib/dayjs";
import { round2 } from "../lib/format";

export default async function whatIf(s: any) {
  if (!s.categorized?.length) return { whatIfOut: undefined };

  const N = s.timeWindowDays ?? 7; // 7 = week, 30 = month

  const dates = s.categorized
    .map((r: any) => dayjs(r.date))
    .filter((d: any) => d.isValid());
  const now = dates.length ? dayjs.max(dates) : dayjs();
  const lastStart = now.subtract(N - 1, "day");

  // N-day window
  const spendN: Record<string, number> = {};
  let incomeN = 0;
  for (const r of s.categorized) {
    const d = dayjs(r.date);
    if (!d.isAfter(lastStart)) continue;
    if (r.amount < 0) spendN[r.category] = (spendN[r.category] ?? 0) + Math.abs(r.amount);
    else incomeN += r.amount;
  }
  const totalSpendN = Object.values(spendN).reduce((a, b) => a + b, 0);

  // Fallback to overall if the period is too sparse
  const spendAll: Record<string, number> = {};
  for (const r of s.categorized) {
    if (r.amount < 0) spendAll[r.category] = (spendAll[r.category] ?? 0) + Math.abs(r.amount);
  }
  const USE_OVERALL_THRESHOLD = N === 7 ? 15 : 50;
  const source = totalSpendN < USE_OVERALL_THRESHOLD ? spendAll : spendN;

  const top = Object.entries(source).sort((a, b) => b[1] - a[1])[0];
  if (!top) return { whatIfOut: undefined };

  const [category, amt] = top as [string, number];

  // 10% cut with a minimum practical delta by period
  const MIN_DELTA = N === 7 ? 3 : 10;
  const computed = round2(amt * 0.10);
  const delta = Math.max(MIN_DELTA, computed);

  // Free-to-spend only changes if we’re cutting the current period
  const newFreeToSpend = round2(incomeN - (totalSpendN - (source === spendN ? delta : 0)));

  return { whatIfOut: { category, cutPct: 10, delta: round2(delta), newFreeToSpend } };
}
