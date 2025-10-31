import dayjs from "../lib/dayjs";

// Minimal subscription whitelist; extend as needed
const SUBS_WHITELIST = [
  "spotify", "netflix", "prime video", "amazon prime", "youtube premium",
  "icloud", "microsoft 365", "dropbox", "one drive", "itunes", "deezer",
  "audible", "nyt", "washington post", "office 365"
];

function isWhitelisted(name: string) {
  const n = name.toLowerCase();
  return SUBS_WHITELIST.some(k => n.includes(k));
}

export default async function subs(s: any) {
  if (!s.categorized?.length) return { subOut: [] };

  const byMerchant: Record<string, { ts: number; amt: number; cat: string }[]> = {};
  for (const r of s.categorized) {
    if (r.amount >= 0) continue; // only debits
    (byMerchant[r.merchant] ||= []).push({
      ts: dayjs(r.date).valueOf(),
      amt: Math.abs(r.amount),
      cat: r.category || "Other",
    });
  }

  const out: Array<{ merchant: string; avgAmount: number; cadenceDays: number }> = [];

  for (const [m, arr] of Object.entries(byMerchant)) {
    if (arr.length < 3) continue; // need at least 3 charges

    // Guard: only pass if merchant is whitelisted OR clearly a subscription category
    const looksSubCategory = arr.every(x => x.cat === "Subscriptions" || x.cat === "Bills");
    if (!isWhitelisted(m) && !looksSubCategory) continue;

    arr.sort((a, b) => a.ts - b.ts);

    // Cadence check: 27–33 day gaps median
    const gaps = arr.slice(1).map((x, i) => (x.ts - arr[i].ts) / (1000 * 60 * 60 * 24));
    if (gaps.length < 2) continue;

    const sorted = [...gaps].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median < 27 || median > 33) continue;

    // Amount stability: coefficient of variation <= 15%
    const amts = arr.map(x => x.amt);
    const mean = amts.reduce((a, b) => a + b, 0) / amts.length;
    const variance = amts.reduce((a, b) => a + (b - mean) ** 2, 0) / amts.length;
    const std = Math.sqrt(variance);
    const cov = mean ? std / mean : 1;
    if (cov > 0.15) continue;

    out.push({ merchant: m, avgAmount: +mean.toFixed(2), cadenceDays: Math.round(median) });
  }

  return { subOut: out };
}
