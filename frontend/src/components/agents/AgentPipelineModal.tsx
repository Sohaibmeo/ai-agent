import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentPipelineStep } from '../../hooks/useAgentPipeline';
import { useAgentPipeline } from '../../hooks/useAgentPipeline';

const MIN_STEP_MS = 1000;

const statusText = (step?: AgentPipelineStep | null, fallback?: string) => {
  if (!step) return fallback ?? 'Getting ready...';
  if (step.detail) return step.detail;
  if (step.status === 'done') return 'Completed';
  if (step.status === 'error') return 'Something went wrong';
  if (step.status === 'active') return 'In progress...';
  return fallback ?? 'Waiting...';
};

const pickTargetStep = (steps: AgentPipelineStep[]): AgentPipelineStep | null => {
  if (!steps.length) return null;
  const active = steps.find((s) => s.status === 'active');
  if (active) return active;
  const lastDone = [...steps].reverse().find((s) => s.status === 'done');
  if (lastDone) return lastDone;
  const pending = steps.find((s) => s.status === 'pending');
  return pending ?? steps[0];
};

function StepSlide({
  step,
  variant,
}: {
  step: AgentPipelineStep;
  variant: 'current' | 'exit';
}) {
  const statusColor =
    step.status === 'done'
      ? 'text-emerald-200 border-emerald-400/50'
      : step.status === 'error'
        ? 'text-red-200 border-red-500/50'
        : 'text-slate-100 border-slate-600/60';

  return (
    <div
      className={[
        'absolute inset-0 rounded-xl border bg-slate-900/80 px-4 py-4 shadow-2xl',
        variant === 'exit' ? 'conveyor-exit' : 'conveyor-enter',
        statusColor,
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <div
          className={[
            'flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700',
            step.status === 'active'
              ? 'bg-emerald-500/10 text-emerald-200'
              : step.status === 'done'
                ? 'bg-emerald-500/15 text-emerald-100'
                : step.status === 'error'
                  ? 'bg-red-500/15 text-red-100'
                  : 'bg-slate-800/70 text-slate-200',
          ].join(' ')}
        >
          {step.status === 'done' ? '✓' : step.status === 'error' ? '!' : '•'}
        </div>
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-white">{step.label}</div>
          <div className="text-xs text-slate-300">{statusText(step)}</div>
        </div>
      </div>
    </div>
  );
}

export function AgentPipelineModal() {
  const { state, endRun } = useAgentPipeline();
  const [visibleStep, setVisibleStep] = useState<AgentPipelineStep | null>(null);
  const [exitingStep, setExitingStep] = useState<AgentPipelineStep | null>(null);
  const lastSwitchRef = useRef<number>(0);

  const targetStep = useMemo(() => pickTargetStep(state.steps), [state.steps]);

  useEffect(() => {
    if (!state.isOpen) {
      setVisibleStep(null);
      setExitingStep(null);
      lastSwitchRef.current = Date.now();
      return;
    }
    if (!targetStep) return;
    const elapsed = Date.now() - lastSwitchRef.current;
    const delay = Math.max(0, MIN_STEP_MS - elapsed);
    const timer = window.setTimeout(() => {
      if (visibleStep && (visibleStep.id !== targetStep.id || visibleStep.status !== targetStep.status)) {
        setExitingStep(visibleStep);
      }
      setVisibleStep(targetStep);
      lastSwitchRef.current = Date.now();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [targetStep, state.isOpen, visibleStep]);

  useEffect(() => {
    if (!exitingStep) return;
    const timer = window.setTimeout(() => setExitingStep(null), 420);
    return () => window.clearTimeout(timer);
  }, [exitingStep]);

  const allDone = state.steps.length > 0 && state.steps.every((s) => s.status === 'done');
  const hasError = !!state.errorMessage;
  const showClose = state.canClose || allDone || hasError;
  const progressFallback = useMemo(() => {
    if (!state.steps.length) return state.progress;
    const done = state.steps.filter((s) => s.status === 'done').length;
    const active = state.steps.find((s) => s.status === 'active');
    const hint = visibleStep?.progressHint ?? state.progress;
    const base = (done / state.steps.length) * 100 + (active ? 100 / (state.steps.length * 2) : 0);
    return Math.max(hint || 0, base);
  }, [state.steps, state.progress, visibleStep]);
  const progress = Math.min(100, Math.max(state.progress, progressFallback));

  const subtitle = hasError ? state.errorMessage : state.subtitle;
  const isClosing = state.closing || allDone;
  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <section className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-950/95 px-6 py-6 shadow-2xl sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute inset-x-0 -top-32 h-40 bg-gradient-to-b from-emerald-500/25 via-transparent to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -left-10 top-16 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 bottom-8 h-36 w-36 rounded-full bg-amber-400/10 blur-3xl" />

        <header className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/60 bg-slate-900/90 shadow-emerald-500/20 shadow-lg">
              <span className="text-2xl" aria-hidden="true">
                🍲
              </span>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
                AI Agent
              </p>
              <h2 className="text-lg font-semibold text-white leading-tight">{state.title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-emerald-200">
            <div className="flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-2 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
              Live
            </div>
          </div>
        </header>

        {isClosing && (
          <div className="relative mt-5 flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-emerald-900/50 px-4 py-3 shadow-lg shadow-emerald-500/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white icon-pop-spin">
              ✓
            </div>
            <div className="text-sm text-emerald-100">
              Plan ready! You can close this window once you’re done reading.
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-4">
          <div className="relative h-20 w-20 rounded-2xl border border-slate-700 bg-slate-900/80 shadow-inner shadow-emerald-500/10">
            <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
              <span className="steam-line block h-3 w-8 rounded-full bg-emerald-200/80 blur-[1px]" />
              <span className="steam-line block h-3 w-8 rounded-full bg-emerald-100/70 blur-[1px]" />
              <span className="steam-line block h-3 w-8 rounded-full bg-emerald-50/70 blur-[1px]" />
            </div>
            <div className="absolute inset-2 rounded-xl bg-gradient-to-b from-emerald-500/80 via-emerald-500/70 to-emerald-600/70 flex items-center justify-center text-xl font-black text-emerald-950">
              🍲
            </div>
            <div className="absolute inset-x-3 bottom-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="absolute inset-y-0 left-0 w-full animate-pulse bg-gradient-to-r from-amber-400 via-amber-500 to-amber-300" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>{subtitle || 'Keeping you updated step by step...'}</span>
              <span className="text-emerald-200 font-semibold">{Math.round(progress)}%</span>
            </div>
            <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800 progress-animated">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500 transition-[width] duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(progress, 2))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="relative mt-7 h-28 overflow-hidden">
          {exitingStep && <StepSlide step={exitingStep} variant="exit" />}
          {visibleStep && <StepSlide step={visibleStep} variant="current" />}
          {!visibleStep && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/70 text-slate-200">
              Preparing steps...
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end text-xs text-slate-300">
          {(() => {
            const label = state.closing ? 'Closing...' : showClose ? 'Close' : 'Please wait';
            return (
              <button
                type="button"
                className={[
                  'rounded-lg px-3 py-2 text-[11px] font-semibold shadow-lg transition',
                  showClose
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-500'
                    : 'bg-slate-700 text-slate-300 cursor-not-allowed opacity-60',
                ].join(' ')}
                onClick={() => {
                  if (showClose) endRun();
                }}
                disabled={!showClose}
              >
                {label}
              </button>
            );
          })()}
        </div>
      </section>
    </div>
  );
}
