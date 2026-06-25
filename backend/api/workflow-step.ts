import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleWorkflowBundle } from './workflow-handler';

export default async function workflowStep(req: IncomingMessage, res: ServerResponse) {
  await handleWorkflowBundle(req, res, 'steps.mjs');
}
