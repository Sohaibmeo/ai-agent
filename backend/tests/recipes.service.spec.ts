import { RecipesService } from '../src/recipes/recipes.service';
import { Repository } from 'typeorm';
import { PreferencesService } from '../src/preferences/preferences.service';
import { Recipe, RecipeIngredient } from '../src/database/entities';

describe('RecipesService', () => {
  const mockFind = jest.fn();
  const mockGetProfile = jest.fn();
  const mockFindScores = jest.fn();
  const mockFindIngredients = jest.fn();

  const recipeRepo = {
    createQueryBuilder: () => qb,
  } as any;
  const qb: any = {
    andWhere: () => qb,
    limit: () => qb,
    leftJoin: () => qb,
    addSelect: () => qb,
    orderBy: () => qb,
    getMany: mockFind,
  };

  const recipeIngredientRepo = { find: mockFindIngredients } as any;
  const prefsService = {
    getForUser: jest.fn(async () => ({ liked_meals: { r1: 2 }, liked_ingredients: {} })),
  } as any;

  const service = new RecipesService(
    recipeRepo as unknown as Repository<Recipe>,
    recipeIngredientRepo as unknown as Repository<RecipeIngredient>,
    { find: mockFindScores } as any,
    { getProfile: mockGetProfile } as any,
    { findAll: jest.fn() } as any,
    prefsService as PreferencesService,
    {} as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ranks by recipe score when available', async () => {
    mockFind.mockResolvedValueOnce([
      { id: 'r1', name: 'A', base_cost_gbp: 1 },
      { id: 'r2', name: 'B', base_cost_gbp: 1 },
    ]);
    mockGetProfile.mockResolvedValue({
      max_difficulty: 'easy',
      allergy_keys: [],
      diet_type: null,
    });
    const results = await service.findCandidatesForUser({ userId: 'u1', mealSlot: 'lunch' });
    expect(results[0].id).toBe('r1');
  });
});
