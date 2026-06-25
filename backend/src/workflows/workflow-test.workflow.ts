export type WorkflowTestInput = {
  message?: string;
  requestedAt?: string;
};

export const TEST_WORKFLOW = {
  workflowId: 'workflow//./src/workflows/workflow-test.workflow//testWorkflow',
};

function getInternalBaseUrl() {
  const configured = process.env.WORKFLOW_INTERNAL_BASE_URL || process.env.PUBLIC_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

async function callWorkflowTestStep(input: WorkflowTestInput) {
  'use step';

  const secret = process.env.WORKFLOW_SECRET;
  if (!secret) {
    throw new Error('WORKFLOW_SECRET is required for workflow tests');
  }

  const response = await fetch(`${getInternalBaseUrl()}/workflow-test/echo`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-workflow-secret': secret,
    },
    body: JSON.stringify({
      message: input.message || 'workflow-test',
      requestedAt: input.requestedAt,
      executedAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Workflow test step failed: ${response.status} ${detail}`);
  }

  return response.json() as Promise<{ ok: boolean; received: Record<string, unknown> }>;
}

export async function testWorkflow(input: WorkflowTestInput) {
  'use workflow';

  const result = await callWorkflowTestStep(input);
  return {
    ok: true,
    message: input.message || 'workflow-test',
    stepResult: result,
  };
}
