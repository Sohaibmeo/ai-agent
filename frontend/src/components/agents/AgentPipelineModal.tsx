import { useAgentPipeline } from '../../hooks/useAgentPipeline';

export function AgentPipelineModal() {
  const { state, endRun } = useAgentPipeline();
  if (!state.isOpen) return null;

  const allDone = state.steps.length > 0 && state.steps.every((s) => s.status === 'done');
  const showClose = state.canClose || allDone;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <section className="relative w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-950/95 px-6 py-6 shadow-2xl sm:px-8 sm:py-7 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-32 h-40 bg-gradient-to-b from-emerald-500/25 via-transparent to-transparent blur-3xl" />

        <div className="relative flex flex-col items-center text-center text-slate-100">
          <div className="relative mb-4 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/60 bg-slate-900/90">
              <div className="h-7 w-7 animate-spin rounded-full border-t-2 border-emerald-400" />
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/90">AI Agent</p>
          <h2 className="mt-1 text-lg font-semibold text-white">{state.title}</h2>
          {state.subtitle && <p className="mt-2 text-sm text-slate-300">{state.subtitle}</p>}
        </div>

        <ol className="relative mt-5 space-y-3 border-l border-slate-700/60 pl-4 text-slate-100">
          {state.steps.map((step) => {
            const isActive = step.status === 'active';
            const isDone = step.status === 'done';
            const isError = step.status === 'error';

            return (
              <li key={step.id} className="relative pl-2">
                <span className="absolute -left-[9px] top-1 flex h-3 w-3 items-center justify-center">
                  <span
                    className={[
                      'h-3 w-3 rounded-full border',
                      isDone
                        ? 'bg-emerald-500 border-emerald-500'
                        : isError
                        ? 'bg-red-500 border-red-500'
                        : isActive
                        ? 'bg-emerald-400 border-emerald-400 animate-pulse'
                        : 'bg-slate-700 border-slate-600',
                    ].join(' ')}
                  />
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">{step.label}</span>
                  <span className="text-xs text-slate-400">
                    {step.detail ??
                      (isDone
                        ? 'Completed'
                        : isError
                        ? 'Something went wrong'
                        : isActive
                        ? 'In progress...'
                        : 'Waiting...')}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 flex items-center justify-between text-xs text-slate-300">
          <span className={state.errorMessage ? 'text-red-300' : 'text-slate-300'}>
            {state.errorMessage ?? 'Talking to your AI coach...'}
          </span>
          {showClose && (
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500"
              onClick={endRun}
            >
              Close
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
