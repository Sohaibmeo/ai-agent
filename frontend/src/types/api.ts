export type Category =
  | "Groceries"
  | "Dining"
  | "Transport"
  | "Shopping"
  | "Bills"
  | "Subscriptions"
  | "Entertainment"
  | "Health"
  | "Education"
  | "Travel"
  | "Income"
  | "Other";

export type Row = {
  date: string;
  merchant: string;
  amount: number;
  note?: string;
  parse_confidence: number;
};

export type CatRow = Row & {
  category: Category;
  source: "rule" | "llm" | "reconciled";
  rationale: string;
  confidence: number;
};

export type SubscriptionInsight = {
  merchant: string;
  avgAmount: number;
  cadenceDays: number;
};

export type AnomalyInsight = {
  category: Category;
  lastN: number;
  medianPrev: number;
  ratio?: number;
  winDays?: number;
  period?: string;
};

export type WhatIfInsight = {
  category: Category;
  cutPct: number;
  delta: number;
  newFreeToSpend: number;
};

export type Insights = {
  totalsByCategory: Partial<Record<Category, number>>;
  subscriptions: SubscriptionInsight[];
  anomalies: AnomalyInsight[];
  whatIf?: WhatIfInsight;
};

export type TracePayload = {
  csv?: string;
  rows?: Row[];
  ruleCats?: CatRow[];
  nerCats?: CatRow[];
  subOut?: SubscriptionInsight[];
  anomOut?: AnomalyInsight[];
  whatIfOut?: WhatIfInsight;
};

export type AnalyzeResponse = {
  period: string;
  timeWindowDays: number;
  goal: number;
  csvPath?: string;
  categorized: CatRow[];
  insights: Insights;
  advice: string;
  trace?: TracePayload;
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

export type StepStatus = "pending" | "running" | "done" | "error";

export type StepSummary = {
  key: StepKey;
  title: string;
  description: string;
  status: StepStatus;
  icon: string;
  output?: unknown;
};
