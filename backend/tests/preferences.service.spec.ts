import { PreferencesService } from '../src/preferences/preferences.service';
import { Repository } from 'typeorm';
import { UserPreferences, UserIngredientScore, UserRecipeScore } from '../src/database/entities';

class InMemoryRepo<T extends { id?: string }> {
  data: T[] = [];
  constructor(private key: (item: T) => string) {}
  async findOne(opts: any): Promise<T | null> {
    const userId = opts.where.user.id;
    return this.data.find((d: any) => d.user?.id === userId) || null;
  }
  create(partial: any): T {
    return partial as T;
  }
  async save(entity: T): Promise<T> {
    const id = this.key(entity);
    const idx = this.data.findIndex((d) => this.key(d) === id);
    if (idx >= 0) this.data[idx] = entity;
    else this.data.push(entity);
    return entity;
  }
  async upsert(entity: any): Promise<any> {
    return this.save(entity as T);
  }
}

describe('PreferencesService', () => {
  let prefRepo: any;
  let ingScoreRepo: any;
  let recipeScoreRepo: any;
  let service: PreferencesService;

  beforeEach(() => {
    prefRepo = new InMemoryRepo<UserPreferences>((d) => d.user?.id || '');
    ingScoreRepo = new InMemoryRepo<UserIngredientScore>((d) => `${d.user?.id}-${d.ingredient?.id}`);
    recipeScoreRepo = new InMemoryRepo<UserRecipeScore>((d) => `${d.user?.id}-${d.recipe?.id}`);
    service = new PreferencesService(prefRepo as unknown as Repository<UserPreferences>, ingScoreRepo as any, recipeScoreRepo as any);
  });

  it('increments ingredient preference and score', async () => {
    await service.incrementIngredientPreference('u1', 'like', 'ing1');
    const prefs = await service.getForUser('u1');
    expect(prefs?.liked_ingredients['ing1']).toBe(1);
  });

  it('increments meal preference and score', async () => {
    await service.incrementMealPreference('u1', 'like', 'rec1');
    const prefs = await service.getForUser('u1');
    expect(prefs?.liked_meals['rec1']).toBe(1);
  });
});
