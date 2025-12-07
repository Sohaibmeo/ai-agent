export type PipelineStepStatus = 'pending' | 'running' | 'done' | 'error';

export interface PipelineStep {
  id: string;
  label: string;
  status: PipelineStepStatus;
  detail?: string;
  progressHint?: number;
  startedAt?: string;
  finishedAt?: string;
  meta?: Record<string, any>;
}

export interface AgentPipelineSummary {
  kind: 'generate-week' | 'review-plan' | 'adjust-recipe';
  steps: PipelineStep[];
  startedAt: string;
  finishedAt?: string;
  progress: number;
  currentStepId?: string;
}
