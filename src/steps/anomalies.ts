import dayjs from "../lib/dayjs";

export default async function anomalies(s: any) {
  if (!s.categorized?.length) return { anomOut: [] };
  const dates = s.categorized.map((r:any)=>dayjs(r.date)).filter((d:any)=>d.isValid());
  const now = dates.length ? dayjs.max(dates) : dayjs();
  const last7Start = now.subtract(6,"day");
  const last7: Record<string, number> = {};
  const weeklySums: Record<string, number[]> = {};

  for (const r of s.categorized) {
    const d = dayjs(r.date);
    if (r.amount < 0) {
      if (d.isAfter(last7Start)) last7[r.category] = (last7[r.category] ?? 0) + Math.abs(r.amount);
      const weekIndex = Math.floor(now.diff(d, "day")/7);
      weeklySums[r.category] ??= [0,0,0,0];
      if (weekIndex < 4) weeklySums[r.category][weekIndex] += Math.abs(r.amount);
    }
  }

  const anomOut: Array<{ category: string; last7: number; median4w: number }> = [];
  for (const [cat, w] of Object.entries(weeklySums)) {
    const sorted = [...w].sort((a,b)=>a-b);
    const med = sorted[Math.floor(sorted.length/2)] || 0;
    const l7 = last7[cat] ?? 0;
    if (med > 0 && l7 > 2 * med) anomOut.push({ category: cat, last7: +l7.toFixed(2), median4w: +med.toFixed(2) });
  }
  return { anomOut };
}
