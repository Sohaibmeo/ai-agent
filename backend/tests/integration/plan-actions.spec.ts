import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AgentsService } from '../../src/agents/agents.service';

jest.setTimeout(30000);

describe('Plan actions + agent usage (integration)', () => {
  let app: INestApplication;
  const userId = '674fac73-a45a-4bec-8ee3-278d395e6faa'; // demo user
  const reviewActionMock = jest.fn(async (payload: any) => ({
    targetLevel: 'meal',
    action: 'regenerate_meal',
    targetIds: { planMealId: payload.actionContext?.planMealId },
  }));
  const coachPlanMock = jest.fn().mockRejectedValue(new Error('LLM unavailable'));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AgentsService)
      .useValue({
        reviewAction: reviewActionMock,
        coachPlan: coachPlanMock,
        explain: jest.fn(),
        nutritionAdvice: jest.fn(),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('invokes review agent and applies action endpoint', async () => {
    const planRes = await request(app.getHttpServer())
      .post('/plans/generate')
      .send({ userId })
      .expect(201);

    const planId = planRes.body.id;
    const planMealId = planRes.body.days?.[0]?.meals?.[0]?.id;
    expect(planId).toBeDefined();
    expect(planMealId).toBeDefined();

    const actionRes = await request(app.getHttpServer())
      .post(`/plans/${planId}/actions`)
      .send({
        userId,
        actionContext: { type: 'regenerate_meal', planMealId },
        reasonText: 'lighter meal',
      })
      .expect(201);

    expect(reviewActionMock).toHaveBeenCalled();
    expect(actionRes.body?.days?.[0]?.meals?.length).toBeGreaterThan(0);
  });

  it('falls back to deterministic generation when coach agent fails', async () => {
    const res = await request(app.getHttpServer())
      .post('/plans/generate')
      .send({ userId, useAgent: true })
      .expect(201);

    expect(coachPlanMock).toHaveBeenCalled();
    const meals = res.body?.days?.flatMap((d: any) => d.meals || []) || [];
    expect(meals.length).toBeGreaterThan(0);
  });
});
