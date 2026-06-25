import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { PlansService } from './plans.service';
import type { PlanGenerationOverrides } from '../workflows/plan-generation.workflow';

type GenerateWorkflowDayBody = {
  planId: string;
  userId: string;
  weekStartDate: string;
  dayIndex: number;
  overrides?: PlanGenerationOverrides;
};

type FinalizeWorkflowPlanBody = {
  planId: string;
  userId: string;
};

@Controller('plans/workflow')
export class PlansWorkflowController {
  constructor(private readonly plansService: PlansService) {}

  private assertWorkflowSecret(secretHeader?: string) {
    const expected = process.env.WORKFLOW_SECRET;
    if (!expected || secretHeader !== expected) {
      throw new UnauthorizedException('Invalid workflow secret');
    }
  }

  @Post('day')
  generateDay(@Headers('x-workflow-secret') secret: string | undefined, @Body() body: GenerateWorkflowDayBody) {
    this.assertWorkflowSecret(secret);
    return this.plansService.generateWorkflowDay(body);
  }

  @Post('finalize')
  finalize(@Headers('x-workflow-secret') secret: string | undefined, @Body() body: FinalizeWorkflowPlanBody) {
    this.assertWorkflowSecret(secret);
    return this.plansService.finalizeWorkflowPlan(body.planId, body.userId);
  }
}
