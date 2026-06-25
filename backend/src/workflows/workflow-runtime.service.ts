import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { tmpdir } from 'os';
import { join } from 'path';

@Injectable()
export class WorkflowRuntimeService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowRuntimeService.name);
  readonly outDir = process.env.WORKFLOW_BUNDLE_DIR || join(
    process.env.VERCEL ? tmpdir() : process.cwd(),
    '.nestjs',
    'workflow',
  );
  private buildPromise?: Promise<void>;

  onModuleInit() {
    this.buildPromise = this.buildWorkflowBundles().catch((error) => {
      this.logger.error(`Workflow bundle build failed: ${(error as Error).message}`);
      this.buildPromise = undefined;
    });
  }

  async ensureBuilt() {
    if (!this.buildPromise) {
      this.buildPromise = this.buildWorkflowBundles();
    }
    await this.buildPromise;
  }

  private async buildWorkflowBundles() {
    const { NestLocalBuilder } = await import('@workflow/nest/builder');
    const builder = new NestLocalBuilder({
      workingDir: process.cwd(),
      outDir: this.outDir,
      moduleType: 'commonjs',
      distDir: 'dist',
    });

    await builder.build();
    this.logger.log(`Workflow bundles ready at ${this.outDir}`);
  }
}
