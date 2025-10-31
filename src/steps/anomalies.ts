import dayjs from "../lib/dayjs";

export default async function anomalies(s: any) {
  if (!s.categorized?.length) return { anomOut: [] };

  const N = s.timeWindowDays ?? 7;                // 7 = week, 30 = month
  const PERIOD_LABEL = s.periodLabel ?? (N === 30 ? "month" : "week");

  // Thresholds tuned by period (adjust if you want more/less sensitivity)
  const MIN_BASELINE = N === 7 ? 10 : 40;         // ignore tiny baselines
  const MIN_ABS_LIFT = N === 7 ? 8 : 20;          // require absolute lift too
  const RATIO_THRESH = N === 7 ? 1.8 : 1.7;       // current >= 1.8x / 1.7x baseline

  // Establish "now" from data
  const dates = s.categorized
    .map((r: any) => dayjs(r.date))
    .filter((d: any) => d.isValid());
  const now = dates.length ? dayjs.max(dates) : dayjs();

  // Helper: sum debits in [start, end]
  function sumWindow(start: any, end: any) {
    const perCat: Record<string, number> = {};
    for (const r of s.categorized) {
      if (r.amount >= 0) continue; // spend only
      const d = dayjs(r.date);
      if (d.isAfter(start.subtract(1, "millisecond")) && d.isBefore(end.add(1, "millisecond"))) {
        perCat[r.category] = (perCat[r.category] ?? 0) + Math.abs(r.amount);
      }
    }
    return perCat;
  }

  // Current N-day window: (now - (N-1) days) .. now
  const curStart = now.subtract(N - 1, "day");
  const curEnd = now;
  const cur = sumWindow(curStart, curEnd);

  // Previous 3 N-day windows (back-to-back)
  const prevWins: Array<Record<string, number>> = [];
  for (let i = 1; i <= 3; i++) {
    const end = curStart.subtract((i - 1) * N, "day").subtract(1, "day");
    const start = end.subtract(N - 1, "day");
    prevWins.push(sumWindow(start, end));
  }

  // Build baseline as the median across previous windows for each category
  const anomOut: Array<{
    category: string;
    lastN: number;         // spend in current window
    medianPrev: number;    // median spend over previous windows
    ratio: number;         // lastN / medianPrev
    winDays: number;       // N
    period: string;        // "week" | "month"
  }> = [];

  // Consider all categories that appear in current or past windows
  const cats = new Set<string>();
  Object.keys(cur).forEach(c => cats.add(c));
  for (const w of prevWins) Object.keys(w).forEach(c => cats.add(c));

  for (const cat of cats) {
    const lastN = +(cur[cat] ?? 0).toFixed(2);
    const prevVals = prevWins.map(w => w[cat] ?? 0);
    // median of previous windows (ignore zeros only if all zero -> baseline 0)
    const sorted = [...prevVals].sort((a, b) => a - b);
    const medianPrevRaw =
      sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;

    const medianPrev = +medianPrevRaw.toFixed(2);

    // Skip if baseline too small or zero
    if (medianPrev <= 0 || medianPrev < MIN_BASELINE) continue;

    const absLift = lastN - medianPrev;
    const ratio = medianPrev > 0 ? +(lastN / medianPrev).toFixed(2) : Infinity;

    if (lastN >= medianPrev + MIN_ABS_LIFT && ratio >= RATIO_THRESH) {
      anomOut.push({
        category: cat,
        lastN: +lastN.toFixed(2),
        medianPrev,
        ratio,
        winDays: N,
        period: PERIOD_LABEL,
      });
    }
  }

  // Sort biggest offenders first
  anomOut.sort((a, b) => (b.lastN - b.medianPrev) - (a.lastN - a.medianPrev));

  return { anomOut };
}
