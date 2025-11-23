import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AgentsService } from '../../src/agents/agents.service';

jest.setTimeout(30000);

describe('Review + swap via agent (mocked)', () => {
  let app: INestApplication;
  const userId = '11111111-1111-1111-1111-111111111111'; // seeded user

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AgentsService)
      .useValue({
        reviewAction: jest.fn(async () => ({ action: 'swap' })),
        coachPlan: jest.fn(),
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

  it('runs review-and-swap and returns review payload', async () => {
    // generate plan
    const planRes = await request(app.getHttpServer())
      .post('/plans/generate')
      .send({ userId })
      .expect(201);
    const meal = planRes.body.days[0].meals[0];
    // get candidates
    const candidatesRes = await request(app.getHttpServer())
      .get('/recipes/candidates')
      .query({ userId, mealSlot: meal.meal_slot })
      .expect(200);
    const candidates = candidatesRes.body;
    const res = await request(app.getHttpServer())
      .post('/agents/review-and-swap')
      .send({ planMealId: meal.id, text: 'swap this', candidates })
      .expect(201);
    expect(res.body.review.action).toBe('swap');
  });
});
