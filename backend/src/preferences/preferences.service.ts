import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreferences, UserIngredientScore, UserRecipeScore } from '../database/entities';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(UserPreferences)
    private readonly prefRepo: Repository<UserPreferences>,
    @InjectRepository(UserIngredientScore)
    private readonly ingScoreRepo: Repository<UserIngredientScore>,
    @InjectRepository(UserRecipeScore)
    private readonly recipeScoreRepo: Repository<UserRecipeScore>,
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
    await this.prefRepo.save(prefs);
    const delta = type === 'like' ? 1 : -1;
    await this.ingScoreRepo.upsert(
      {
        user: { id: userId } as any,
        ingredient: { id: ingredientId } as any,
        score: delta,
      },
      {
        conflictPaths: ['user', 'ingredient'],
        upsertType: 'on-conflict-do-update',
        upsertColumns: ['score', 'updated_at'],
      } as any,
    );
    return prefs;
  }

  async incrementMealPreference(userId: string, type: 'like' | 'dislike', recipeId: string) {
    let prefs = await this.ensurePrefs(userId);
    const key = type === 'like' ? 'liked_meals' : 'disliked_meals';
    const map = { ...(prefs as any)[key] } as Record<string, number>;
    map[recipeId] = (map[recipeId] || 0) + 1;
    (prefs as any)[key] = map;
    await this.prefRepo.save(prefs);
    const delta = type === 'like' ? 2 : -2;
    await this.recipeScoreRepo.upsert(
      {
        user: { id: userId } as any,
        recipe: { id: recipeId } as any,
        score: delta,
      },
      {
        conflictPaths: ['user', 'recipe'],
        upsertType: 'on-conflict-do-update',
        upsertColumns: ['score', 'updated_at'],
      } as any,
    );
    return prefs;
  }

  async incrementManyIngredients(userId: string, type: 'like' | 'dislike', ingredientIds: string[]) {
    const unique = Array.from(new Set(ingredientIds));
    for (const id of unique) {
      await this.incrementIngredientPreference(userId, type, id);
    }
  }

  async setAvoidIngredient(userId: string, ingredientId: string, score: number = -10) {
    await this.ingScoreRepo.upsert(
      {
        user: { id: userId } as any,
        ingredient: { id: ingredientId } as any,
        score,
      },
      {
        conflictPaths: ['user', 'ingredient'],
        upsertType: 'on-conflict-do-update',
        upsertColumns: ['score', 'updated_at'],
      } as any,
    );
  }
}
