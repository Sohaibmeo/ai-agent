import rules from "../../rules.json" assert { type: "json" };

const CATEGORY_PRECEDENCE = [
  "Subscriptions",
  "Bills",
  "Groceries",
  "Dining",
  "Transport",
  "Shopping",
  "Income",
  "Other"
] as const;

type Cat = (typeof CATEGORY_PRECEDENCE)[number];

function escapeRegex(s: string) {
  // Escape special chars, then allow flexible spaces
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}

export default async function ruleMatcher(s: any) {
  // Precompile rules to regex with word boundaries
  const compiled: Array<{ cat: Cat; key: string; rx: RegExp; len: number }> = [];
  for (const [catRaw, arr] of Object.entries(rules as Record<string, string[]>)) {
    const cat = (catRaw as Cat) || "Other";
    for (const k of arr) {
      const escaped = escapeRegex(k.trim().toLowerCase());
      // \b ... \b helps avoid partial hits (e.g., “prime” in “primark”)
      const pattern = `\\b${escaped}\\b`;
      compiled.push({ cat, key: k, rx: new RegExp(pattern, "i"), len: k.length });
    }
  }

  const ruleCats = s.rows.map((r: any) => {
    const text = String(r.merchant ?? r.description ?? "").toLowerCase();

    // Find all matches
    const hits = compiled.filter(({ rx }) => rx.test(text));
    if (hits.length === 0) {
      return {
        ...r,
        category: "Other",
        source: "rule",
        rationale: "No rule hit",
        confidence: 0.4
      };
    }

    // If multiple matches, resolve:
    // 1) Prefer Income when amount is positive AND Income matched.
    const incomeHit = hits.find(h => h.cat === "Income");
    if (r.amount > 0 && incomeHit) {
      return {
        ...r,
        category: "Income",
        source: "rule",
        rationale: `Matched keyword rule: "${incomeHit.key}" (credit → Income)`,
        confidence: 0.95
      };
    }

    // 2) Otherwise, choose by CATEGORY_PRECEDENCE, then by longest keyword.
    hits.sort((a, b) => {
      const pa = CATEGORY_PRECEDENCE.indexOf(a.cat);
      const pb = CATEGORY_PRECEDENCE.indexOf(b.cat);
      if (pa !== pb) return pa - pb;              // lower index = higher precedence
      return b.len - a.len;                        // longer keyword wins
    });

    const pick = hits[0];
    const others = hits.slice(1);
    const reason =
      others.length
        ? `Resolved overlaps → chose ${pick.cat} via precedence/length (hit: "${pick.key}")`
        : `Matched keyword rule: "${pick.key}"`;

    return {
      ...r,
      category: pick.cat,
      source: "rule",
      rationale: reason,
      confidence: 0.9
    };
  });

  return { ruleCats };
}
