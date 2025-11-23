import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AgentsService } from '../../src/agents/agents.service';

describe('Plan generation with agent (mocked)', () => {
  let app: INestApplication;
  const userId = '11111111-1111-1111-1111-111111111111'; // seeded test user

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AgentsService)
      .useValue({
        coachPlan: jest.fn(async (payload: any) => {
          const days = (payload?.candidates?.days || []).map((d: any) => ({
            day_index: d.day_index,
            meals: d.meals.map((m: any) => ({
              meal_slot: m.meal_slot,
              recipe_id: m.candidates?.[0]?.id,
              portion_multiplier: 1,
            })),
          }));
          return {
            week_start_date: payload.week_start_date,
            days,
          };
        }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('uses mocked coach agent when useAgent=true', async () => {
    const res = await request(app.getHttpServer())
      .post('/plans/generate')
      .send({ userId, useAgent: true })
      .expect(201);

    const plan = res.body;
    expect(plan.days?.length).toBeGreaterThan(0);
    const firstMeal = plan.days[0].meals[0];
    expect(firstMeal).toBeDefined();
    expect(firstMeal.recipe.id).toBeTruthy();
  });
});
