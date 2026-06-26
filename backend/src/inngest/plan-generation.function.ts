import type { PlansService, PlanGenerationOverrides } from '../plans/plans.service';
import { inngest } from './client';

export type PlanGenerationRequested = {
  planId: string;
  userId: string;
  weekStartDate: string;
  useAgent: boolean;
  overrides?: PlanGenerationOverrides;
};

export function createPlanGenerationFunctions(plansService: PlansService) {
  const generateWeeklyPlan = inngest.createFunction(
    {
      id: 'generate-weekly-plan',
      triggers: [{ event: 'plans/generate.requested' }],
      retries: 1,
    },
    async ({ event, step }) => {
      const input = event.data as PlanGenerationRequested;
      const pipeline = plansService.createQueuedPlanPipeline(input.planId, input.userId, input.weekStartDate);

      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        plansService.markQueuedPlanDayStarted(pipeline, dayIndex);
        const result = await step.run(`generate-day-${dayIndex}`, async () => {
          return plansService.generateQueuedPlanDay({
            planId: input.planId,
            userId: input.userId,
            weekStartDate: input.weekStartDate,
            dayIndex,
            overrides: input.overrides,
          });
        });
        plansService.markQueuedPlanDayDone(pipeline, dayIndex, result);
      }

      plansService.markQueuedPlanFinalizing(pipeline, input.planId);
      await step.run('finalize-plan', async () => {
        return plansService.finalizeQueuedPlan(input.planId, input.userId);
      });
      plansService.markQueuedPlanFinished(pipeline, input.planId);

      return { planId: input.planId, status: 'completed' };
    },
  );

  return [generateWeeklyPlan];
}
