import { Body, Controller, Headers, Logger, Post, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { TEST_WORKFLOW } from './workflow-test.workflow';

@Controller('workflow-test')
export class WorkflowTestController {
  private readonly logger = new Logger(WorkflowTestController.name);

  private assertWorkflowSecret(secretHeader?: string) {
    if (!process.env.WORKFLOW_SECRET || secretHeader !== process.env.WORKFLOW_SECRET) {
      throw new UnauthorizedException('Invalid workflow secret');
    }
  }

  @Post('start')
  async start(@Headers('x-workflow-secret') secret: string | undefined, @Body() body: { message?: string }) {
    this.assertWorkflowSecret(secret);

    const { start } = await import('workflow/api');
    const input = {
      message: body?.message || 'hello from workflow test',
      requestedAt: new Date().toISOString(),
    };

    this.logger.log(`starting workflow test message="${input.message}"`);

    const workflowStart = start(TEST_WORKFLOW, [input]);
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Workflow test start timed out after 15 seconds')), 15000);
    });

    try {
      const run = await Promise.race([workflowStart, timeout]);
      this.logger.log(`workflow test queued run=${run.runId}`);
      return {
        queued: true,
        runId: run.runId,
        input,
      };
    } catch (error) {
      this.logger.error(`workflow test start failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Workflow test could not be queued. Check backend logs for details.');
    }
  }

  @Post('echo')
  echo(@Headers('x-workflow-secret') secret: string | undefined, @Body() body: Record<string, unknown>) {
    this.assertWorkflowSecret(secret);
    this.logger.log(`workflow test echo received ${JSON.stringify(body)}`);

    return {
      ok: true,
      received: body,
    };
  }
}
