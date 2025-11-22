import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Recipe, RecipeIngredient } from '../database/entities';
import { RecipeCandidatesQueryDto } from './dto/recipe-candidates-query.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
    @InjectRepository(RecipeIngredient)
    private readonly recipeIngredientRepo: Repository<RecipeIngredient>,
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

  findOneById(id: string) {
    return this.recipeRepo.findOne({ where: { id } });
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

  async createCustomFromExisting(input: {
    baseRecipeId: string;
    newName: string;
    mealSlot?: string;
    difficulty?: string;
    ingredientItems: { ingredientId: string; quantity: number; unit: string }[];
  }) {
    const base = await this.recipeRepo.findOne({
      where: { id: input.baseRecipeId },
    });
    if (!base) {
      throw new Error('Base recipe not found');
    }

    const recipe = this.recipeRepo.create({
      name: input.newName,
      meal_slot: input.mealSlot || base.meal_slot,
      diet_tags: base.diet_tags,
      difficulty: input.difficulty || base.difficulty,
      is_custom: true,
      createdByUser: base.createdByUser,
    });
    const savedRecipe = await this.recipeRepo.save(recipe);

    const ris: RecipeIngredient[] = [];
    for (const item of input.ingredientItems) {
      const ingredient = { id: item.ingredientId } as any;
      const ri = this.recipeIngredientRepo.create({
        recipe: savedRecipe,
        ingredient,
        quantity: item.quantity,
        unit: item.unit,
      });
      ris.push(ri);
    }
    await this.recipeIngredientRepo.save(ris);

    // TODO: recompute macros/cost from ingredients; for now, copy base values.
    savedRecipe.base_kcal = base.base_kcal;
    savedRecipe.base_protein = base.base_protein;
    savedRecipe.base_carbs = base.base_carbs;
    savedRecipe.base_fat = base.base_fat;
    savedRecipe.base_cost_gbp = base.base_cost_gbp;
    await this.recipeRepo.save(savedRecipe);

    return savedRecipe;
  }
}
