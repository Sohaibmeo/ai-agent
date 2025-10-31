import dayjs from "../lib/dayjs";

export default async function subs(s: any) {
  const byMerchant: Record<string, { ts: number; amt: number }[]> = {};

  for (const r of s.categorized) {
    if (r.amount >= 0) continue; // only debits count toward subs
    (byMerchant[r.merchant] ||= []).push({
      ts: dayjs(r.date).valueOf(),
      amt: Math.abs(r.amount),
    });
  }

  const subOut: Array<{ merchant: string; avgAmount: number; cadenceDays: number }> = [];

  for (const [m, arr] of Object.entries(byMerchant)) {
    if (arr.length < 2) continue; // need at least 2 charges

    arr.sort((a, b) => a.ts - b.ts);
    const gaps = arr.slice(1).map((x, i) => (x.ts - arr[i].ts) / (1000 * 60 * 60 * 24));

    // Primary: mean gap ± tolerance (monthly-ish)
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const monthlyishByMean = avgGap >= 25 && avgGap <= 35;

    // Secondary fallback: at least one individual gap in a relaxed monthly window
    const monthlyishByAny = gaps.some((g) => g >= 27 && g <= 35);

    if (monthlyishByMean || monthlyishByAny) {
      const avgAmt = +(arr.reduce((a, b) => a + b.amt, 0) / arr.length).toFixed(2);
      subOut.push({
        merchant: m,
        avgAmount: avgAmt,
        cadenceDays: Math.round(avgGap),
      });
    }
  }

  return { subOut };
}
