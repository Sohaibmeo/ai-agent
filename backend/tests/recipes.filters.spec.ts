import { RecipesService } from '../src/recipes/recipes.service';
import { Repository } from 'typeorm';
import { Recipe, RecipeIngredient, UserRecipeScore } from '../src/database/entities';

const makeRecipe = (id: string, meal_slot: string, difficulty: string, diet_tags: string[] = []) =>
  ({ id, meal_slot, difficulty, diet_tags } as any);

const mockQB = (recipes: any[]) => {
  const qb: any = {
    andWhere: () => qb,
    limit: () => qb,
    leftJoin: () => qb,
    addSelect: () => qb,
    orderBy: () => qb,
    getMany: jest.fn().mockResolvedValue(recipes),
  };
  return qb;
};

describe('RecipesService filters', () => {
  it('filters by mealSlot and difficulty', async () => {
    const recipes = [
      makeRecipe('r1', 'lunch', 'easy', ['halal']),
      makeRecipe('r2', 'breakfast', 'hard', ['halal']),
    ];
    const qb = mockQB(recipes);
    const repo = { createQueryBuilder: () => qb } as any;
    const service = new RecipesService(
      repo as unknown as Repository<Recipe>,
      {} as unknown as Repository<RecipeIngredient>,
      {} as unknown as Repository<UserRecipeScore>,
      { generateRecipe: jest.fn(), adjustRecipeWithContext: jest.fn() } as any,
    );
    const result = await service.findCandidatesForUser({ userId: 'u1', mealSlot: 'lunch' });
    expect(result[0].id).toBe('r1');
  });
});
