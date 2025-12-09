import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { defaultStepsForKind } from '../config/agentSteps';
import { API_BASE_URL } from '../lib/config';

export type AgentRunKind = 'generate-week' | 'review-plan' | 'adjust-recipe' | 'generic-llm';

export type AgentStepStatus = 'pending' | 'active' | 'done' | 'error';

export interface AgentPipelineStep {
  id: string;
  label: string;
  status: AgentStepStatus;
  detail?: string;
  startedAt?: string;
  finishedAt?: string;
  progressHint?: number;
  meta?: Record<string, any>;
}

export interface AgentPipelineState {
  isOpen: boolean;
  kind: AgentRunKind | null;
  title: string;
  subtitle?: string;
  steps: AgentPipelineStep[];
  canClose: boolean;
  errorMessage?: string;
  progress: number;
  closing: boolean;
  runId?: string;
  startedAt?: string;
}

type AgentPipelineContextValue = {
  state: AgentPipelineState;
  startRun: (
    kind: AgentRunKind,
    opts?: { title?: string; subtitle?: string; steps?: AgentPipelineStep[] },
  ) => void;
  updateStep: (
    stepId: string,
    status: AgentStepStatus,
    detail?: string,
    meta?: Record<string, any>,
    progressHint?: number,
  ) => void;
  endRun: () => void;
  setError: (message: string) => void;
};

const AgentPipelineContext = createContext<AgentPipelineContextValue | null>(null);

const computeProgress = (
  steps: AgentPipelineStep[],
  hint?: number,
  prevProgress = 0,
): number => {
  if (typeof hint === 'number' && Number.isFinite(hint)) {
    return Math.max(prevProgress, Math.min(100, Math.round(hint)));
  }
  if (!steps.length) return prevProgress;
  const total = steps.length;
  const doneCount = steps.filter((s) => s.status === 'done').length;
  const activeIndex = steps.findIndex((s) => s.status === 'active');
  const base = (doneCount / total) * 100;
  const activeBonus = activeIndex >= 0 ? (40 / total) : 0;
  return Math.max(prevProgress, Math.min(100, Math.round(base + activeBonus)));
};

const buildSteps = (kind: AgentRunKind, overrides?: AgentPipelineStep[]): AgentPipelineStep[] => {
  const now = new Date().toISOString();
  const source = overrides && overrides.length ? overrides : defaultStepsForKind(kind);
  return source.map((step, idx) => ({
    ...step,
    status: step.status ?? (idx === 0 ? 'active' : 'pending'),
    startedAt: idx === 0 ? now : step.startedAt,
  }));
};

export function AgentPipelineProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AgentPipelineState>({
    isOpen: false,
    kind: null,
    title: '',
    subtitle: undefined,
    steps: [],
    canClose: false,
    errorMessage: undefined,
    progress: 0,
    closing: false,
    runId: undefined,
    startedAt: undefined,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  type ServerPipelineStep = {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'done' | 'error';
    detail?: string;
    progressHint?: number;
    startedAt?: string;
    finishedAt?: string;
    meta?: Record<string, any>;
  };

  type ServerPipelineSummary = {
    kind: AgentRunKind;
    steps: ServerPipelineStep[];
    startedAt: string;
    finishedAt?: string;
    progress?: number;
    currentStepId?: string;
    pipelineId?: string;
  };

  const mapStatus = (status: ServerPipelineStep['status']): AgentStepStatus => {
    if (status === 'running') return 'active';
    if (status === 'done') return 'done';
    if (status === 'error') return 'error';
    return 'pending';
  };

  const mapSummaryToState = (summary: ServerPipelineSummary) => {
    setState((prev) => {
      const sameRun =
        !prev.runId ||
        !summary.pipelineId ||
        prev.runId === summary.pipelineId ||
        (prev.startedAt ? summary.startedAt >= prev.startedAt : true);
      if (!sameRun) return prev;

      const steps: AgentPipelineStep[] = (summary.steps || []).map((s, idx) => ({
        id: s.id,
        label: s.label,
        detail: s.detail,
        status: mapStatus(s.status),
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
        progressHint: s.progressHint ?? ((idx + 1) / (summary.steps.length || 1)) * 100,
        meta: s.meta,
      }));
      const hasError = steps.some((s) => s.status === 'error');
      const allDone = steps.length > 0 && steps.every((s) => s.status === 'done');
      const progress = Math.max(
        prev.progress,
        typeof summary.progress === 'number' ? summary.progress : 0,
      );
      const title =
        prev.title ||
        (summary.kind === 'generate-week'
          ? 'Cooking up your weekly plan...'
          : summary.kind === 'generic-llm'
            ? 'Working with the AI agent...'
            : 'Adjusting your plan with AI...');

      return {
        ...prev,
        isOpen: true,
        kind: summary.kind,
        title,
        subtitle:
          prev.subtitle ??
          'This can take a little while. We will keep you updated as the agent moves through each step.',
        steps: steps.length ? steps : prev.steps,
        progress,
        canClose: prev.canClose || !!summary.finishedAt || allDone || hasError,
        errorMessage: hasError ? prev.errorMessage ?? 'Something went wrong.' : prev.errorMessage,
        runId: summary.pipelineId ?? prev.runId ?? summary.startedAt,
        startedAt: summary.startedAt ?? prev.startedAt,
        closing: summary.finishedAt ? false : prev.closing,
      };
    });
  };

  useEffect(() => {
    const connect = () => {
      const wsUrl = `${API_BASE_URL.replace(/^http/, 'ws')}/ws/pipeline`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed?.type === 'pipeline' && parsed.data) {
            mapSummaryToState(parsed.data as ServerPipelineSummary);
          }
        } catch (err) {
          // ignore bad payloads
        }
      };

      ws.onclose = () => {
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(connect, 1000);
      };
    };

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRun: AgentPipelineContextValue['startRun'] = (kind, opts = {}) => {
    const steps = buildSteps(kind, opts.steps);
    setState({
      isOpen: true,
      kind,
      title:
        opts.title ??
        (kind === 'generate-week'
          ? 'Cooking up your weekly plan...'
          : kind === 'generic-llm'
            ? 'Working with the AI agent...'
            : 'Adjusting your plan with AI...'),
      subtitle:
        opts.subtitle ??
        'This can take a little while. We will keep you updated as the agent moves through each step.',
      steps,
      canClose: false,
      errorMessage: undefined,
      progress: computeProgress(steps, steps[0]?.progressHint, 0),
      closing: false,
      runId: `local-${Date.now()}`,
      startedAt: new Date().toISOString(),
    });
  };

  const updateStep: AgentPipelineContextValue['updateStep'] = (
    stepId,
    status,
    detail,
    meta,
    progressHint,
  ) => {
    const now = new Date().toISOString();
    setState((prev) => {
      let steps = [...prev.steps];
      let targetIndex = steps.findIndex((s) => s.id === stepId);
      if (targetIndex === -1) {
        steps.push({
          id: stepId,
          label: stepId,
          status: 'pending',
        });
        targetIndex = steps.length - 1;
      }

      if (status === 'active') {
        steps = steps.map((s, idx) =>
          idx !== targetIndex && s.status === 'active'
            ? { ...s, status: 'done', finishedAt: s.finishedAt ?? now }
            : s,
        );
      }

      steps = steps.map((s, idx) => {
        if (idx !== targetIndex) return s;
        const finished =
          status === 'done' || status === 'error'
            ? s.finishedAt ?? now
            : s.finishedAt;
        return {
          ...s,
          status,
          detail: detail ?? s.detail,
          startedAt: s.startedAt ?? now,
          finishedAt: finished,
          progressHint: progressHint ?? s.progressHint,
          meta: meta ? { ...(s.meta || {}), ...meta } : s.meta,
        };
      });

      const progress = computeProgress(steps, progressHint, prev.progress);
      const allDone = steps.length > 0 && steps.every((s) => s.status === 'done');
      const hasError = steps.some((s) => s.status === 'error');
      const canClose = prev.canClose || allDone || hasError;

      return {
        ...prev,
        steps,
        progress,
        canClose,
        runId: prev.runId,
      };
    });
  };

  const setError = (message: string) => {
    setState((prev) => {
      const now = new Date().toISOString();
      const steps: AgentPipelineStep[] = prev.steps.map((s) =>
        s.status === 'active' || s.status === 'pending'
          ? { ...s, status: 'error' as const, finishedAt: s.finishedAt ?? now }
          : s,
      );
      return {
        ...prev,
        errorMessage: message,
        canClose: true,
        steps,
        progress: Math.max(prev.progress, 100),
      };
    });
  };

  const endRun = () => {
    setState((prev) => {
      const allowClose =
        prev.canClose ||
        prev.steps.every((s) => s.status === 'done') ||
        !!prev.errorMessage;
      if (!allowClose || prev.closing) return prev;
      return { ...prev, closing: true };
    });

    setTimeout(() => {
      setState((prev) => {
        if (!prev.closing) return prev;
        return {
          isOpen: false,
          kind: null,
          title: '',
          subtitle: undefined,
          steps: [],
          canClose: false,
          errorMessage: undefined,
          progress: 0,
          closing: false,
          runId: undefined,
          startedAt: undefined,
        };
      });
    }, 520);
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
