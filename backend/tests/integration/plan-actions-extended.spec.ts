import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../../src/app.module';
import { AgentsService } from '../../src/agents/agents.service';
import { Recipe } from '../../src/database/entities';
import { RecipesService } from '../../src/recipes/recipes.service';
import { PlansService } from '../../src/plans/plans.service';

jest.setTimeout(30000);

describe('Plan actions extended flows', () => {
  let app: INestApplication;
  const userId = '11111111-1111-1111-1111-111111111111'; // seeded user

  const reviewActionMock = jest.fn(async (payload: any) => {
    const type = payload.actionContext?.type;
    if (type === 'change_meal_type') {
      return {
        targetLevel: 'meal',
        action: 'change_meal_type',
        targetIds: { planMealId: payload.actionContext?.planMealId },
        params: { preferMealType: 'drinkable' },
      };
    }
    if (type === 'swap_ingredient') {
      return {
        targetLevel: 'meal',
        action: 'swap_ingredient',
        targetIds: { planMealId: payload.actionContext?.planMealId },
        params: {
          ingredientToRemove: payload.actionContext?.ingredientToRemove,
          ingredientToAdd: payload.actionContext?.ingredientToAdd,
        },
      };
    }
    if (type === 'remove_ingredient') {
      return {
        targetLevel: 'meal',
        action: 'remove_ingredient',
        targetIds: { planMealId: payload.actionContext?.planMealId },
        params: { ingredientToRemove: payload.actionContext?.ingredientToRemove },
      };
    }
    return {
      targetLevel: 'meal',
      action: 'regenerate_meal',
      targetIds: { planMealId: payload.actionContext?.planMealId },
    };
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AgentsService)
      .useValue({
        reviewAction: reviewActionMock,
        coachPlan: jest.fn(),
        explain: jest.fn(),
        nutritionAdvice: jest.fn(),
        chooseIngredient: jest.fn(),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function generatePlan() {
    const planRes = await request(app.getHttpServer())
      .post('/plans/generate')
      .send({ userId })
      .expect(201);
    return planRes.body;
  }

  it('handles change_meal_type action', async () => {
    const plan = await generatePlan();
    const meal = plan.days[0].meals[0];
    const res = await request(app.getHttpServer())
      .post(`/plans/${plan.id}/actions`)
      .send({
        userId,
        actionContext: { type: 'change_meal_type', planMealId: meal.id },
        reasonText: 'make this a drink',
      })
      .expect(201);
    expect(reviewActionMock).toHaveBeenCalled();
    expect(res.body?.days?.length).toBeGreaterThan(0);
  });

  it('handles swap and remove ingredient via UUIDs', async () => {
    const plan = await generatePlan();
    const meal = plan.days[0].meals[0];
    const recipeRepo = app.get(getRepositoryToken(Recipe));
    const baseRecipe = await recipeRepo.findOne({ where: { id: meal.recipe.id } });
    const allIngredients = await recipeRepo.manager.query(`SELECT id FROM ingredients LIMIT 2`);
    const ing1 = allIngredients?.[0]?.id;
    const ing2 = allIngredients?.[1]?.id;
    expect(ing1).toBeDefined();
    expect(ing2).toBeDefined();

    // Create a custom recipe with two ingredients to exercise swap/remove
    const recipesService = app.get(RecipesService);
    const plansService = app.get(PlansService);
    const custom = await recipesService.createCustomFromExisting({
      baseRecipeId: baseRecipe.id,
      newName: 'Test Swap Recipe',
      ingredientItems: [
        { ingredientId: ing1, quantity: 1, unit: 'piece' },
        { ingredientId: ing2, quantity: 1, unit: 'piece' },
      ],
    });
    await plansService.setMealRecipe(meal.id, custom.id);

    // Remove one ingredient
    await request(app.getHttpServer())
      .post(`/plans/${plan.id}/actions`)
      .send({
        userId,
        actionContext: {
          type: 'remove_ingredient',
          planMealId: meal.id,
          ingredientToRemove: ing1,
        },
        reasonText: 'remove ingredient by id',
      })
      .expect(201);

    // Reset meal to custom recipe to test swap
    await plansService.setMealRecipe(meal.id, custom.id);

    await request(app.getHttpServer())
      .post(`/plans/${plan.id}/actions`)
      .send({
        userId,
        actionContext: {
          type: 'swap_ingredient',
          planMealId: meal.id,
          ingredientToRemove: ing1,
          ingredientToAdd: ing2,
        },
        reasonText: 'swap ingredient by id',
      })
      .expect(201);
  });
});
