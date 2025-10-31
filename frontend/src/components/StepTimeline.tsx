import { useMemo } from "react";
import type { StepKey, StepSummary } from "../types/api";
import type { RunStatus } from "../hooks/useAnalyze";
import { prettyJsonSnippet } from "../utils/format";

type StepTimelineProps = {
  steps: StepSummary[];
  status: RunStatus;
  selectedStep: StepKey | null;
  onSelectStep: (key: StepKey) => void;
};

const statusLabel = (status: StepSummary["status"], runStatus: RunStatus) => {
  if (runStatus === "processing") {
    if (status === "done") return "Running…";
    return "Pending";
  }
  const map: Record<StepSummary["status"], string> = {
    pending: "Pending",
    running: "Running…",
    done: "Complete",
    error: "Error",
  };
  return map[status];
};

const StepTimeline = ({ steps, status, selectedStep, onSelectStep }: StepTimelineProps) => {
  const derivedSteps = useMemo(() => {
    if (status === "processing") {
      return steps.map((step, index) => ({
        ...step,
        status: index === 0 ? ("running" as const) : ("pending" as const),
      }));
    }
    if (status === "error") {
      return steps.map(step => ({
        ...step,
        status: step.status === "done" ? ("done" as const) : ("pending" as const),
      }));
    }
    return steps;
  }, [steps, status]);

  if (!derivedSteps.length) {
    return (
      <section className="panel">
        <header className="panel__header">
          <div>
            <h2>Pipeline</h2>
            <p className="panel__subtitle">Run an analysis to watch steps appear here.</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <h2>Pipeline</h2>
          <p className="panel__subtitle">Tap a step to inspect what each agent produced.</p>
        </div>
      </header>
      <ul className="timeline">
        {derivedSteps.map(step => {
          const active = selectedStep === step.key;
          return (
            <li key={step.key} className={`timeline__item timeline__item--${step.status} ${active ? "timeline__item--active" : ""}`}>
              <button className="timeline__button" type="button" onClick={() => onSelectStep(step.key)}>
                <span className="timeline__icon" aria-hidden>{step.icon}</span>
                <div className="timeline__content">
                  <div className="timeline__header">
                    <h3>{step.title}</h3>
                    <span className={`status status--${step.status}`}>{statusLabel(step.status, status)}</span>
                  </div>
                  <p>{step.description}</p>
                  {active && (
                    <pre className="snippet">
                      {prettyJsonSnippet(step.output, 16)}
                    </pre>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default StepTimeline;
