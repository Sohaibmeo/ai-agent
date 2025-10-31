import { useCallback, useState } from "react";
import type { AnalyzeResponse, StepKey, StepSummary } from "../types/api";

type RunStatus = "idle" | "processing" | "done" | "error";

type AnalyzeParams = {
  csv: string;
  goal: number;
  period: "week" | "month";
};

type AnalyzeResult = {
  response: AnalyzeResponse;
  steps: StepSummary[];
};

type UseAnalyzeReturn = {
  status: RunStatus;
  error: string | null;
  result: AnalyzeResult | null;
  analyze: (params: AnalyzeParams) => Promise<void>;
};

type StepMeta = {
  key: StepKey;
  title: string;
  description: string;
  icon: string;
  getOutput: (response: AnalyzeResponse) => unknown;
};

export const PIPELINE_META: StepMeta[] = [
  {
    key: "parser",
    title: "Parse CSV",
    description: "Read raw CSV rows and normalise fields.",
    icon: "🧾",
    getOutput: res => res.trace?.rows,
  },
  {
    key: "ruleMatcher",
    title: "Rule Matcher",
    description: "Apply keyword rules to tag categories.",
    icon: "🗂️",
    getOutput: res => res.trace?.ruleCats,
  },
  {
    key: "nerCategorizer",
    title: "LLM Categorizer",
    description: "Use the language model to predict categories.",
    icon: "🤖",
    getOutput: res => res.trace?.nerCats,
  },
  {
    key: "reconcile",
    title: "Reconcile",
    description: "Resolve differences between rules and LLM outputs.",
    icon: "⚖️",
    getOutput: res => res.categorized,
  },
  {
    key: "subs",
    title: "Subscriptions",
    description: "Detect recurring subscription-like payments.",
    icon: "🔁",
    getOutput: res => res.trace?.subOut ?? res.insights.subscriptions,
  },
  {
    key: "anomalies",
    title: "Anomalies",
    description: "Highlight spend spikes against prior windows.",
    icon: "🚨",
    getOutput: res => res.trace?.anomOut ?? res.insights.anomalies,
  },
  {
    key: "whatIf",
    title: "What-if",
    description: "Estimate savings from trimming one category.",
    icon: "🧮",
    getOutput: res => res.trace?.whatIfOut ?? res.insights.whatIf,
  },
  {
    key: "insightsJoin",
    title: "Insights",
    description: "Compile totals and supporting insights.",
    icon: "📊",
    getOutput: res => res.insights,
  },
  {
    key: "coach",
    title: "Coach",
    description: "Generate coaching plan and next actions.",
    icon: "🎯",
    getOutput: res => res.advice,
  },
];

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000";

function buildSteps(response: AnalyzeResponse): StepSummary[] {
  return PIPELINE_META.map(meta => ({
    key: meta.key,
    title: meta.title,
    description: meta.description,
    icon: meta.icon,
    status: "done",
    output: meta.getOutput(response),
  }));
}

export function useAnalyze(): UseAnalyzeReturn {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  const analyze = useCallback(async ({ csv, goal, period }: AnalyzeParams) => {
    setStatus("processing");
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/analyze?verbose=1&period=${encodeURIComponent(period)}&goal=${encodeURIComponent(goal)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, verbose: true }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed with ${response.status}`);
      }

      const json = (await response.json()) as AnalyzeResponse;
      setResult({ response: json, steps: buildSteps(json) });
      setStatus("done");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }, []);

  return { status, error, result, analyze };
}

export type { RunStatus, StepMeta };
