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

      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        await step.run(`generate-day-${dayIndex}`, async () => {
          return plansService.generateQueuedPlanDay({
            planId: input.planId,
            userId: input.userId,
            weekStartDate: input.weekStartDate,
            dayIndex,
            overrides: input.overrides,
          });
        });
      }

      await step.run('finalize-plan', async () => {
        return plansService.finalizeQueuedPlan(input.planId, input.userId);
      });

      return { planId: input.planId, status: 'completed' };
    },
  );

  return [generateWeeklyPlan];
}
