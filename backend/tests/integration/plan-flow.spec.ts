import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { randomUUID } from 'crypto';

jest.setTimeout(30000);

describe('Plan flow e2e', () => {
  let app: INestApplication;
  const userId = randomUUID();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates profile -> generates plan -> swaps meal -> activates -> gets shopping list', async () => {
    // Upsert profile
    await request(app.getHttpServer())
      .put(`/users/${userId}/profile`)
      .send({
        age: 25,
        height_cm: 175,
        weight_kg: 70,
        activity_level: 'moderate',
        goal: 'maintain_weight',
        diet_type: 'halal',
        allergy_keys: [],
        max_difficulty: 'easy',
      })
      .expect(200);

    // Generate plan
    const genRes = await request(app.getHttpServer())
      .post('/plans/generate')
      .send({ userId })
      .expect(201);
    const plan = genRes.body;
    expect(plan.id).toBeDefined();
    const firstMeal = plan.days?.[0]?.meals?.[0];
    expect(firstMeal).toBeDefined();

    // Swap meal with another candidate for same slot
    const candidatesRes = await request(app.getHttpServer())
      .get('/recipes/candidates')
      .query({ userId, mealSlot: firstMeal.meal_slot })
      .expect(200);
    const candidates = candidatesRes.body;
    const alt = candidates.find((c: any) => c.id !== firstMeal.recipe.id) || candidates[0];
    expect(alt).toBeDefined();

    const swapRes = await request(app.getHttpServer())
      .post('/plans/set-meal-recipe')
      .send({ planMealId: firstMeal.id, newRecipeId: alt.id })
      .expect(201);
    expect(swapRes.body.id).toBe(plan.id);

    // Activate plan
    await request(app.getHttpServer())
      .post('/plans/activate')
      .send({ planId: plan.id })
      .expect(201);

    // Get active plan and shopping list
    const activePlan = await request(app.getHttpServer())
      .get(`/plans/active/${userId}`)
      .expect(200);
    expect(activePlan.body.id).toBe(plan.id);

    const listRes = await request(app.getHttpServer())
      .get(`/shopping-list/active/${userId}`)
      .expect(200);
    expect(Array.isArray(listRes.body)).toBe(true);
  });
});
