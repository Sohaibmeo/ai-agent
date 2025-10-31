export default async function reconcile(s: any) {
  const out = s.rows.map((_: any, i: number) => {
    const rule = s.ruleCats?.[i];
    const ner  = s.nerCats?.[i];
    if (rule && ner) {
      if (rule.category === ner.category) {
        return { ...rule, source: "reconciled", rationale: `${rule.rationale}; NER agreed`, confidence: Math.min(0.98, Math.max(rule.confidence, ner.confidence) + 0.05) };
      } else {
        const pick = (rule.confidence ?? 0) >= (ner.confidence ?? 0) ? rule : ner;
        const other = pick === rule ? ner : rule;
        const pickedBy = pick === rule ? "rule (higher confidence)" : "LLM (higher confidence)";
        return { ...pick, source: "reconciled", rationale: `Chose ${pickedBy}: ${(pick.confidence||0).toFixed(2)} vs ${(other.confidence||0).toFixed(2)}` };
      }
    }
    return rule ?? ner ?? { ...s.rows[i], category: "Other", source: "reconciled", rationale: "Fallback", confidence: 0.5 };
  });
  return { categorized: out };
}
