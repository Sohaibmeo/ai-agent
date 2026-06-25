import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { join } from 'path';

@Injectable()
export class WorkflowRuntimeService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowRuntimeService.name);
  readonly outDir = join(process.cwd(), '.nestjs', 'workflow');
  private buildPromise?: Promise<void>;

  onModuleInit() {
    this.buildPromise = this.buildWorkflowBundles();
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
      outDir: this.outDir,
      moduleType: 'commonjs',
      distDir: 'dist',
    });

    await builder.build();
    this.logger.log(`Workflow bundles ready at ${this.outDir}`);
  }
}
