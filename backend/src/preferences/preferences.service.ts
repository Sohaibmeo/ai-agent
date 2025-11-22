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

  async incrementPreference(userId: string, type: 'like' | 'dislike', ingredientId: string) {
    let prefs = await this.getForUser(userId);
    if (!prefs) {
      prefs = this.prefRepo.create({ user: { id: userId } as any, liked_ingredients: {}, disliked_ingredients: {}, preferred_cuisines: {} });
    }
    const key = type === 'like' ? 'liked_ingredients' : 'disliked_ingredients';
    const map = { ...(prefs as any)[key] } as Record<string, number>;
    map[ingredientId] = (map[ingredientId] || 0) + 1;
    (prefs as any)[key] = map;
    return this.prefRepo.save(prefs);
  }
}
