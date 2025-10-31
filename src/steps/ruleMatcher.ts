import rules from "../../rules.json" assert { type: "json" };

export default async function ruleMatcher(s: any) {
  const flatRules: Array<{ cat: string; rx: RegExp }> = [];
  for (const [cat, arr] of Object.entries(rules as Record<string, string[]>)) {
    for (const k of arr) flatRules.push({ cat, rx: new RegExp(k.replace(/\s+/g, "\\s+"), "i") });
  }
  const ruleCats = s.rows.map((r: any) => {
    const hit = flatRules.find(({ rx }) => rx.test(r.merchant));
    if (!hit) return { ...r, category: "Other", source: "rule", rationale: "No rule hit", confidence: 0.4 };
    return { ...r, category: hit.cat, source: "rule", rationale: "Matched keyword rule", confidence: 0.9 };
  });
  return { ruleCats };
}
