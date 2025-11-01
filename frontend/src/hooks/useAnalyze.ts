import { useCallback, useState } from "react";
import type { AnalyzeResponse, StepKey, StepStreamEvent, StepSummary } from "../types/api";

type RunStatus = "idle" | "processing" | "done" | "error";

type AnalyzeParams = {
  csv: string;
  goal: number;
  period: "week" | "month";
  delayMs?: number;
};

type UseAnalyzeReturn = {
  status: RunStatus;
  error: string | null;
  response: AnalyzeResponse | null;
  steps: StepSummary[];
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

export function useAnalyze(): UseAnalyzeReturn {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<AnalyzeResponse | null>(null);

  const createInitialSteps = useCallback(
    () =>
      PIPELINE_META.map(meta => ({
        key: meta.key,
        title: meta.title,
        description: meta.description,
        icon: meta.icon,
        status: "pending" as const,
        output: undefined,
      })),
    []
  );

  const [steps, setSteps] = useState<StepSummary[]>(() => createInitialSteps());

  const analyze = useCallback(async ({ csv, goal, period, delayMs = 0 }: AnalyzeParams) => {
    setStatus("processing");
    setError(null);
    setResponseData(null);
    setSteps(createInitialSteps());

    try {
      const params = new URLSearchParams({
        period,
        goal: String(goal),
      });
      if (delayMs > 0) params.set("delay", String(delayMs));

      const response = await fetch(`${API_BASE}/analyze/stream?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed with ${response.status}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;
      let encounteredError = false;

      const updateStep = (key: StepKey, updater: (step: StepSummary) => StepSummary) => {
        setSteps(prev => prev.map(step => (step.key === key ? updater(step) : step)));
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;
          let event: StepStreamEvent;
          try {
            event = JSON.parse(line) as StepStreamEvent;
          } catch (parseErr) {
            console.error("Failed to parse stream chunk", parseErr, line);
            continue;
          }

          if (event.type === "step") {
            if (event.status === "start") {
              updateStep(event.step, step => ({ ...step, status: "running" }));
            } else if (event.status === "complete") {
              updateStep(event.step, step => ({
                ...step,
                status: "done",
                output: event.output ?? step.output,
              }));
            }
          } else if (event.type === "error") {
            encounteredError = true;
            if (event.step) {
              updateStep(event.step, step => ({ ...step, status: "error" }));
            }
            setError(event.message ?? "Stream error");
            setStatus("error");
          } else if (event.type === "complete") {
            completed = true;
            setResponseData(event.result);
            setSteps(prev =>
              prev.map(step => {
                const matching = PIPELINE_META.find(meta => meta.key === step.key);
                const outputFromResult = matching ? matching.getOutput(event.result) : undefined;
                return {
                  ...step,
                  status: "done",
                  output: step.output ?? outputFromResult,
                };
              })
            );
          }
        }
      }

      if (completed && !encounteredError) {
        setStatus("done");
      } else if (encounteredError) {
        setStatus("error");
      } else {
        setStatus("error");
        setError(prev => prev ?? "Stream ended unexpectedly");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }, [createInitialSteps]);

  return { status, error, response: responseData, steps, analyze };
}

export type { RunStatus, StepMeta };
