import { useAgentPipeline } from '../../hooks/useAgentPipeline';

export function AgentPipelineModal() {
  const { state, endRun } = useAgentPipeline();
  if (!state.isOpen) return null;

  const allDone = state.steps.length > 0 && state.steps.every((s) => s.status === 'done');
  const showClose = state.canClose || allDone;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <section className="card w-full max-w-lg mx-4 p-6">
        <header className="mb-4">
          <p className="text-xs font-medium tracking-wide text-emerald-600 uppercase">AI Agent Activity</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{state.title}</h2>
          {state.subtitle && <p className="mt-1 text-sm text-slate-500">{state.subtitle}</p>}
        </header>

        <ol className="relative space-y-3 border-l border-slate-200 pl-4">
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
                        ? 'bg-emerald-600 border-emerald-600'
                        : isError
                        ? 'bg-red-500 border-red-500'
                        : isActive
                        ? 'bg-emerald-500 border-emerald-500 animate-pulse'
                        : 'bg-slate-100 border-slate-300',
                    ].join(' ')}
                  />
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-900">{step.label}</span>
                  <span className="text-xs text-slate-500">
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

        {state.errorMessage && (
          <p className="mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {state.errorMessage}
          </p>
        )}

        <footer className="mt-5 flex items-center justify-between">
          <div className="flex-1">
            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-1 w-1/3 animate-[progress_1.2s_ease-in-out_infinite] bg-emerald-500" />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              We are asking the agent to plan around your macros, budget and preferences.
            </p>
          </div>

          {showClose && (
            <button
              type="button"
              className="ml-4 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              onClick={endRun}
            >
              Close
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
