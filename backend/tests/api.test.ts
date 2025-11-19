import request from 'supertest';
import app from '../index';

describe('User Profile API', () => {
  it('should return 404 for missing profile', async () => {
    const res = await request(app).get('/api/user/profile/9999');
    expect(res.status).toBe(404);
  });

  it('should create and retrieve a user profile', async () => {
    const profile = {
      age: 30,
      height_cm: 175,
      weight_kg: 70,
      activity_level: 'moderate',
      goal: 'maintain_weight',
      goal_intensity: 'medium',
      diet_type: 'halal',
      allergy_keys: [],
      breakfast_enabled: true,
      snack_enabled: true,
      lunch_enabled: true,
      dinner_enabled: true,
      max_difficulty: 'easy',
      weekly_budget_gbp: 40
    };
    const resPut = await request(app).put('/api/user/profile/1').send(profile);
    expect(resPut.status).toBe(200);
    expect(resPut.body.age).toBe(30);

    const resGet = await request(app).get('/api/user/profile/1');
    expect(resGet.status).toBe(200);
    expect(resGet.body.age).toBe(30);
  });
});

describe('Weekly Plan API', () => {
  it('should generate a weekly plan for a user', async () => {
    // Assume user profile exists for userId 1
    const res = await request(app).post('/api/plan/generate-week/1');
    expect(res.status).toBe(200);
    expect(res.body.plan).toBeDefined();
    expect(res.body.plan.length).toBe(7);
    expect(res.body.plan[0].meals).toBeDefined();
  });
});
