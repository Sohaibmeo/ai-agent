import { All, Controller, Get, Head, Post, Req, Res } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { WorkflowRuntimeService } from './workflow-runtime.service';

type WorkflowBundle = {
  HEAD?: (request: Request) => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
};

@Controller('.well-known/workflow/v1')
export class WorkflowRuntimeController {
  constructor(private readonly workflowRuntime: WorkflowRuntimeService) {}

  @Post('step')
  handleStep(@Req() req: any, @Res() res: any) {
    return this.handleGeneratedEndpoint(req, res, 'steps.mjs');
  }

  @Head('step')
  handleStepHead(@Req() req: any, @Res() res: any) {
    return this.handleGeneratedEndpoint(req, res, 'steps.mjs');
  }

  @Post('flow')
  handleFlow(@Req() req: any, @Res() res: any) {
    return this.handleGeneratedEndpoint(req, res, 'workflows.mjs');
  }

  @Head('flow')
  handleFlowHead(@Req() req: any, @Res() res: any) {
    return this.handleGeneratedEndpoint(req, res, 'workflows.mjs');
  }

  @All('webhook/:token')
  async handleWebhook(@Req() req: any, @Res() res: any) {
    await this.workflowRuntime.ensureBuilt();
    const bundle = (await import(pathToFileURL(join(this.workflowRuntime.outDir, 'webhook.mjs')).href)) as WorkflowBundle;
    const webResponse = await bundle.POST(this.toWebRequest(req));
    await this.sendWebResponse(res, webResponse);
  }

  @Get('manifest.json')
  async handleManifest(@Res() res: any) {
    if (process.env.WORKFLOW_PUBLIC_MANIFEST !== '1') {
      return this.sendNotFound(res);
    }

    await this.workflowRuntime.ensureBuilt();
    try {
      const manifest = readFileSync(join(this.workflowRuntime.outDir, 'manifest.json'), 'utf-8');
      await this.sendWebResponse(
        res,
        new Response(manifest, { headers: { 'content-type': 'application/json' } }),
      );
    } catch {
      this.sendNotFound(res);
    }
  }

  private async handleGeneratedEndpoint(req: any, res: any, bundleFileName: 'steps.mjs' | 'workflows.mjs') {
    await this.workflowRuntime.ensureBuilt();
    const bundle = (await import(pathToFileURL(join(this.workflowRuntime.outDir, bundleFileName)).href)) as WorkflowBundle;
    const handler = req.method === 'HEAD' && bundle.HEAD ? bundle.HEAD : bundle.POST;
    const webResponse = await handler(this.toWebRequest(req));
    await this.sendWebResponse(res, webResponse);
  }

  private toWebRequest(req: any) {
    const protocol = req.protocol ?? (req.raw?.socket?.encrypted ? 'https' : 'http');
    const host = req.headers.host ?? req.hostname;
    const url = req.originalUrl ?? req.url;
    const body = req.method !== 'GET' && req.method !== 'HEAD'
      ? req.body === undefined
        ? undefined
        : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body)
      : undefined;

    return new Request(`${protocol}://${host}${url}`, {
      method: req.method,
      headers: req.headers,
      body,
    });
  }

  private async sendWebResponse(res: any, webResponse: Response) {
    const headers: Record<string, string> = {};
    webResponse.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const body = await webResponse.text();
    if (typeof res.code === 'function') {
      return res.code(webResponse.status).headers(headers).send(body);
    }

    res.status(webResponse.status);
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
    return res.end(body);
  }

  private sendNotFound(res: any) {
    if (typeof res.code === 'function') {
      return res.code(404).send('');
    }
    return res.status(404).end('');
  }
}
