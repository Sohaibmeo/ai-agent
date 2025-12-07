import { createContext, useContext, useState, ReactNode } from 'react';

export type AgentRunKind = 'generate-week' | 'review-plan' | 'adjust-recipe';

export type AgentStepStatus = 'pending' | 'active' | 'done' | 'error';

export interface AgentPipelineStep {
  id: string;
  label: string;
  status: AgentStepStatus;
  detail?: string;
}

export interface AgentPipelineState {
  isOpen: boolean;
  kind: AgentRunKind | null;
  title: string;
  subtitle?: string;
  steps: AgentPipelineStep[];
  canClose: boolean;
  errorMessage?: string;
}

type AgentPipelineContextValue = {
  state: AgentPipelineState;
  startRun: (
    kind: AgentRunKind,
    opts?: { title?: string; subtitle?: string; steps?: AgentPipelineStep[] },
  ) => void;
  updateStep: (stepId: string, status: AgentStepStatus, detail?: string) => void;
  endRun: () => void;
  setError: (message: string) => void;
};

const AgentPipelineContext = createContext<AgentPipelineContextValue | null>(null);

export function AgentPipelineProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AgentPipelineState>({
    isOpen: false,
    kind: null,
    title: '',
    steps: [],
    canClose: false,
  });

  const startRun: AgentPipelineContextValue['startRun'] = (kind, opts = {}) => {
    const defaultSteps: AgentPipelineStep[] =
      kind === 'generate-week'
        ? [
            { id: 'prepare-profile', label: 'Preparing your profile & targets', status: 'active' },
            { id: 'generate-days', label: 'Generating daily meals with the coach', status: 'pending' },
            { id: 'save-plan', label: 'Saving plan & recomputing totals', status: 'pending' },
            { id: 'shopping-list', label: 'Building shopping list', status: 'pending' },
          ]
        : [
            { id: 'interpret-request', label: 'Understanding your request', status: 'active' },
            { id: 'plan-changes', label: 'Planning safe changes to your plan', status: 'pending' },
            { id: 'apply-changes', label: 'Applying changes to your meals', status: 'pending' },
            { id: 'recompute', label: 'Recomputing nutrition & costs', status: 'pending' },
          ];

    setState({
      isOpen: true,
      kind,
      title:
        opts.title ??
        (kind === 'generate-week' ? 'Cooking up your weekly plan...' : 'Adjusting your plan with AI...'),
      subtitle:
        opts.subtitle ??
        'This can take a little while. We’ll keep you updated as the agent moves through each step.',
      steps: opts.steps ?? defaultSteps,
      canClose: false,
      errorMessage: undefined,
    });
  };

  const updateStep = (stepId: string, status: AgentStepStatus, detail?: string) => {
    setState((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === stepId ? { ...s, status, detail: detail ?? s.detail } : s,
      ),
    }));
  };

  const setError = (message: string) => {
    setState((prev) => ({
      ...prev,
      errorMessage: message,
      steps: prev.steps.map((s) =>
        s.status === 'active' || s.status === 'pending' ? { ...s, status: 'error' } : s,
      ),
      canClose: true,
    }));
  };

  const endRun = () => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
      kind: null,
      steps: [],
      errorMessage: undefined,
      canClose: false,
    }));
  };

  return (
    <AgentPipelineContext.Provider value={{ state, startRun, updateStep, endRun, setError }}>
      {children}
    </AgentPipelineContext.Provider>
  );
}

export function useAgentPipeline() {
  const ctx = useContext(AgentPipelineContext);
  if (!ctx) throw new Error('useAgentPipeline must be used within AgentPipelineProvider');
  return ctx;
}
