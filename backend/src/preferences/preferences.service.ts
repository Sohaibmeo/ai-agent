import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreferences } from '../database/entities';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(UserPreferences)
    private readonly prefRepo: Repository<UserPreferences>,
  ) {}

  async getForUser(userId: string) {
    return this.prefRepo.findOne({ where: { user: { id: userId } as any } });
  }

  private async ensurePrefs(userId: string) {
    const existing = await this.getForUser(userId);
    if (existing) return existing;
    return this.prefRepo.create({
      user: { id: userId } as any,
      liked_ingredients: {},
      disliked_ingredients: {},
      liked_meals: {},
      disliked_meals: {},
      preferred_cuisines: {},
    });
  }

  async incrementIngredientPreference(userId: string, type: 'like' | 'dislike', ingredientId: string) {
    let prefs = await this.ensurePrefs(userId);
    const key = type === 'like' ? 'liked_ingredients' : 'disliked_ingredients';
    const map = { ...(prefs as any)[key] } as Record<string, number>;
    map[ingredientId] = (map[ingredientId] || 0) + 1;
    (prefs as any)[key] = map;
    return this.prefRepo.save(prefs);
  }

  async incrementMealPreference(userId: string, type: 'like' | 'dislike', recipeId: string) {
    let prefs = await this.ensurePrefs(userId);
    const key = type === 'like' ? 'liked_meals' : 'disliked_meals';
    const map = { ...(prefs as any)[key] } as Record<string, number>;
    map[recipeId] = (map[recipeId] || 0) + 1;
    (prefs as any)[key] = map;
    return this.prefRepo.save(prefs);
  }

  async incrementManyIngredients(userId: string, type: 'like' | 'dislike', ingredientIds: string[]) {
    const unique = Array.from(new Set(ingredientIds));
    for (const id of unique) {
      await this.incrementIngredientPreference(userId, type, id);
    }
  }
}
