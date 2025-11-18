import { pool } from "./db.js";

export async function recordAgentRun(params: {
  agentType: string;
  status: "pending" | "success" | "failed";
  inputPayload: unknown;
  outputPayload?: unknown;
  runId?: string;
}) {
  const { agentType, status, inputPayload, outputPayload, runId } = params;
  const query = runId
    ? `UPDATE agent_runs SET status = $2, output_payload = $3, completed_at = now() WHERE id = $1`
    : `INSERT INTO agent_runs (agent_type, status, input_payload, output_payload, completed_at)
        VALUES ($1,$2,$3,$4, CASE WHEN $2 = 'pending' THEN NULL ELSE now() END)
        RETURNING id`;

  if (runId) {
    await pool.query(query, [runId, status, outputPayload ?? null]);
    return runId;
  }

  const result = await pool.query(query, [agentType, status, JSON.stringify(inputPayload ?? {}), outputPayload ?? null]);
  return result.rows[0]?.id as string;
}

export async function recordPlanEvent(params: {
  planId?: string;
  actor: string;
  action: string;
  metadata?: unknown;
}) {
  const { planId, actor, action, metadata } = params;
  await pool.query(
    `INSERT INTO plan_events (plan_id, actor, action, metadata) VALUES ($1,$2,$3,$4)`,
    [planId ?? null, actor, action, metadata ? JSON.stringify(metadata) : null],
  );
}
