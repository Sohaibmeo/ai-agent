export type PlanGenerationOverrides = {
  useLlmRecipes?: boolean;
  sameMealsAllWeek?: boolean;
  weeklyBudgetGbp?: number;
  breakfast_enabled?: boolean;
  snack_enabled?: boolean;
  lunch_enabled?: boolean;
  dinner_enabled?: boolean;
  maxDifficulty?: string;
};

export type PlanGenerationWorkflowInput = {
  planId: string;
  userId: string;
  weekStartDate: string;
  overrides?: PlanGenerationOverrides;
};

export const GENERATE_WEEKLY_PLAN_WORKFLOW = {
  workflowId: 'workflow//./src/workflows/plan-generation.workflow//generateWeeklyPlanWorkflow',
};

type WorkflowStepResult = {
  planId: string;
  dayIndex?: number;
  status: string;
};

function getInternalBaseUrl() {
  const configured = process.env.WORKFLOW_INTERNAL_BASE_URL || process.env.PUBLIC_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

async function callPlanGenerationStep(path: string, payload: Record<string, unknown>): Promise<WorkflowStepResult> {
  'use step';

  const secret = process.env.WORKFLOW_SECRET;
  if (!secret) {
    throw new Error('WORKFLOW_SECRET is required for plan generation workflows');
  }

  const response = await fetch(`${getInternalBaseUrl()}/plans/workflow/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-workflow-secret': secret,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Plan workflow step ${path} failed: ${response.status} ${detail}`);
  }

  return response.json() as Promise<WorkflowStepResult>;
}

export async function generateWeeklyPlanWorkflow(input: PlanGenerationWorkflowInput) {
  'use workflow';

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    await callPlanGenerationStep('day', { ...input, dayIndex });
  }

  await callPlanGenerationStep('finalize', { planId: input.planId, userId: input.userId });
  return { planId: input.planId, status: 'completed' };
}
