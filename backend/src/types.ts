export type Category =
  | "Groceries" | "Dining" | "Transport" | "Shopping" | "Bills" | "Subscriptions"
  | "Entertainment" | "Health" | "Education" | "Travel" | "Income" | "Other";

export type Row = {
  date: string; merchant: string; amount: number;
  note?: string; parse_confidence: number;
};

export type CatRow = Row & {
  category: Category; source: "rule" | "llm" | "reconciled";
  rationale: string; confidence: number;
};

export type Insights = {
  totalsByCategory: Record<Category, number>;
  subscriptions: { merchant: string; avgAmount: number; cadenceDays: number }[];
  anomalies: { category: Category; lastN: number; medianPrev: number }[];
  whatIf?: { category: Category; cutPct: number; delta: number; newFreeToSpend: number };
};

export type Store = {
  csv: string; goal?: number;

  // NEW: time window config
  timeWindowDays?: number;        // 7 (default) or 30
  periodLabel?: "week" | "month"; // copy helper

  rows: Row[];
  ruleCats?: CatRow[];
  nerCats?: CatRow[];
  categorized: CatRow[];
  subOut?: Insights["subscriptions"];
  anomOut?: Insights["anomalies"];
  whatIfOut?: Insights["whatIf"];
  insights: Insights;
  advice: string;
};

export type StepKey =
  | "parser"
  | "ruleMatcher"
  | "nerCategorizer"
  | "reconcile"
  | "subs"
  | "anomalies"
  | "whatIf"
  | "insightsJoin"
  | "coach";
