import parser from "./steps/parser";
import ruleMatcher from "./steps/ruleMatcher";
import nerCategorizer from "./steps/nerCategorizer";
import reconcile from "./steps/reconcile";
import subs from "./steps/subs";
import anomalies from "./steps/anomalies";
import whatIf from "./steps/whatIf";
import insightsJoin from "./steps/insightJoins";
import coach from "./steps/coach";
import type { CatRow, Insights, Row, StepKey, Category } from "./types";

type PipelineInput = {
  csv: string;
  goal?: number;
  timeWindowDays?: number;
  periodLabel?: "week" | "month";
};

type PipelineState = PipelineInput & {
  rows?: Row[];
  ruleCats?: CatRow[];
  nerCats?: CatRow[];
  categorized?: CatRow[];
  subOut?: Insights["subscriptions"];
  anomOut?: Insights["anomalies"];
  whatIfOut?: Insights["whatIf"];
  insights?: Insights;
  advice?: string;
};

type StepFn = (state: PipelineState) => Promise<Partial<PipelineState>>;

type StepDefinition = {
  key: StepKey;
  run: StepFn;
};

const STEPS: StepDefinition[] = [
  { key: "parser", run: parser as StepFn },
  { key: "ruleMatcher", run: ruleMatcher as StepFn },
  { key: "nerCategorizer", run: nerCategorizer as StepFn },
  { key: "reconcile", run: reconcile as StepFn },
  { key: "subs", run: subs as StepFn },
  { key: "anomalies", run: anomalies as StepFn },
  { key: "whatIf", run: whatIf as StepFn },
  { key: "insightsJoin", run: insightsJoin as StepFn },
  { key: "coach", run: coach as StepFn },
];

export type PipelineEvent =
  | { type: "step"; status: "start"; step: StepKey }
  | { type: "step"; status: "complete"; step: StepKey; output: Partial<PipelineState> }
  | { type: "error"; message: string; step?: StepKey }
  | { type: "complete"; result: PipelineState };

type EventSink = (event: PipelineEvent) => void;

type PipelineOptions = {
  stepDelayMs?: number;
};

export async function runPipeline(
  input: PipelineInput,
  emit?: EventSink,
  options: PipelineOptions = {}
): Promise<PipelineState> {
  let state: PipelineState = {
    goal: input.goal,
    csv: input.csv,
    timeWindowDays: input.timeWindowDays,
    periodLabel: input.periodLabel,
  };

  const delayMs = Math.max(0, options.stepDelayMs ?? 0);

  for (const step of STEPS) {
    emit?.({ type: "step", status: "start", step: step.key });
    try {
      const output = await step.run(state);
      state = { ...state, ...output };
      emit?.({ type: "step", status: "complete", step: step.key, output });
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Step failed";
      emit?.({ type: "error", message, step: step.key });
      throw err;
    }
  }

  emit?.({ type: "complete", result: state });
  return state;
}

type FormatOptions = {
  csvPath?: string;
  includeTrace?: boolean;
};

function emptyInsights(): Insights {
  return {
    totalsByCategory: {} as Record<Category, number>,
    subscriptions: [],
    anomalies: [],
    whatIf: undefined,
  };
}

export function buildResponse(
  state: PipelineState,
  { csvPath, includeTrace }: FormatOptions = {}
) {
  const period =
    state.periodLabel ??
    (state.timeWindowDays === 30 ? "month" : "week");

  const insights = state.insights ?? emptyInsights();

  const base = {
    period,
    timeWindowDays: state.timeWindowDays ?? (period === "month" ? 30 : 7),
    goal: typeof state.goal === "number" ? state.goal : period === "month" ? 120 : 30,
    csvPath,
    categorized: state.categorized ?? [],
    insights,
    advice: state.advice ?? "",
  };

  if (!includeTrace) return base;

  return {
    ...base,
    trace: {
      csv: state.csv,
      rows: state.rows,
      ruleCats: state.ruleCats,
      nerCats: state.nerCats,
      subOut: state.subOut,
      anomOut: state.anomOut,
      whatIfOut: state.whatIfOut,
    },
  };
}
