import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

type WorkflowBundle = {
  HEAD?: (request: Request) => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
};

function toHeaderEntries(headers: IncomingMessage['headers']) {
  const entries: [string, string][] = [];

  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) entries.push([key, item]);
    } else if (value !== undefined) {
      entries.push([key, String(value)]);
    }
  }

  return entries;
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function sendWebResponse(res: ServerResponse, response: Response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
}

export async function handleWorkflowBundle(req: IncomingMessage, res: ServerResponse, bundleFileName: 'steps.mjs' | 'workflows.mjs') {
  const bundle = (await import(pathToFileURL(join(process.cwd(), '.nestjs', 'workflow', bundleFileName)).href)) as WorkflowBundle;
  const method = req.method || 'POST';
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(req);
  const request = new Request(`https://${req.headers.host || 'localhost'}${req.url || '/'}`, {
    method,
    headers: toHeaderEntries(req.headers),
    body,
  });
  const handler = method === 'HEAD' && bundle.HEAD ? bundle.HEAD : bundle.POST;
  await sendWebResponse(res, await handler(request));
}
