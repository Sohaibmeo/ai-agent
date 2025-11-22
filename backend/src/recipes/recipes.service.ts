import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Recipe } from '../database/entities';
import { RecipeCandidatesQueryDto } from './dto/recipe-candidates-query.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
    private readonly usersService: UsersService,
  ) {}

  findAll() {
    return this.recipeRepo.find({ relations: ['ingredients'] });
  }

  private difficultyOrder = ['super_easy', 'easy', 'medium', 'hard'];

  private allowedDifficulties(max?: string) {
    if (!max) return this.difficultyOrder;
    const idx = this.difficultyOrder.indexOf(max);
    if (idx === -1) return this.difficultyOrder;
    return this.difficultyOrder.slice(0, idx + 1);
  }

  async findCandidatesForUser(query: RecipeCandidatesQueryDto) {
    const profile = await this.usersService.getProfile(query.userId);

    const allowedDifficulty = this.allowedDifficulties(query.maxDifficulty || profile.max_difficulty);
    const qb = this.recipeRepo.createQueryBuilder('recipe');

    if (query.mealSlot) {
      qb.andWhere('recipe.meal_slot = :mealSlot', { mealSlot: query.mealSlot });
    }

    if (profile.diet_type) {
      qb.andWhere(':dietType = ANY (recipe.diet_tags)', { dietType: profile.diet_type });
    }

    if (allowedDifficulty.length) {
      qb.andWhere('recipe.difficulty IN (:...allowedDifficulty)', { allowedDifficulty });
    }

    const allergyKeys = profile.allergy_keys || [];
    if (allergyKeys.length) {
      qb.andWhere(
        new Brackets((sub) => {
          sub.andWhere(
            `NOT EXISTS (
              SELECT 1
              FROM recipe_ingredients ri
              JOIN ingredients ing ON ing.id = ri.ingredient_id
              WHERE ri.recipe_id = recipe.id
              AND ing.allergen_keys && :allergyKeys
            )`,
            { allergyKeys },
          );
        }),
      );
    }

    qb.limit(10);

    const recipes = await qb.getMany();
    return recipes;
  }
}
