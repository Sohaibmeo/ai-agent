import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AgentsService } from '../../src/agents/agents.service';

describe('Plan generation with agent (mocked)', () => {
  let app: INestApplication;
  const userId = '11111111-1111-1111-1111-111111111111'; // seeded test user

  const mockGenerateDayPlan = jest.fn(async (payload: any) => ({
    day_index: payload.day_index,
    meals: (payload.meal_slots || ['meal']).map((slot: string) => ({
      meal_slot: slot,
      name: `LLM ${slot}`,
      instructions: 'Do thing',
      ingredients: [{ ingredient_name: 'chicken breast', quantity: 200, unit: 'g' }],
    })),
  }));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AgentsService)
      .useValue({
        generateDayPlanWithCoachLLM: mockGenerateDayPlan,
        generateRecipe: jest.fn(async (payload: any) => ({
          name: payload.note ? `LLM ${payload.note}` : 'Seed meal',
          meal_slot: payload.meal_slot || 'meal',
          meal_type: payload.meal_type || 'solid',
          difficulty: payload.difficulty || 'easy',
          instructions: 'Mix all',
          ingredients: [{ ingredient_name: 'chicken breast', quantity: 200, unit: 'g' }],
        })),
        reviewAction: jest.fn(),
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
    expect(mockGenerateDayPlan).toHaveBeenCalled();
  });
});
