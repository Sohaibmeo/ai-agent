import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Recipe, RecipeIngredient, UserIngredientScore, UserRecipeScore, Ingredient } from '../database/entities';
import { RecipeCandidatesQueryDto } from './dto/recipe-candidates-query.dto';
import { UsersService } from '../users/users.service';
import { IngredientsService } from '../ingredients/ingredients.service';
import { PreferencesService } from '../preferences/preferences.service';
import { AgentsService } from '../agents/agents.service';
import { GenerateRecipeDto } from './dto/generate-recipe.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
    @InjectRepository(RecipeIngredient)
  private readonly recipeIngredientRepo: Repository<RecipeIngredient>,
    @InjectRepository(UserRecipeScore)
  private readonly recipeScoreRepo: Repository<UserRecipeScore>,
  private readonly usersService: UsersService,
  private readonly ingredientsService: IngredientsService,
  private readonly preferencesService: PreferencesService,
  private readonly agentsService: AgentsService,
) {}

  async listForUser(userId?: string, search?: string) {
    const qb = this.recipeRepo
      .createQueryBuilder('recipe')
      .leftJoinAndSelect('recipe.ingredients', 'ingredients')
      .leftJoinAndSelect('ingredients.ingredient', 'ingredientEnt')
      .orderBy('recipe.name', 'ASC')
      .limit(200);

    if (userId) {
      qb.andWhere('(recipe.createdByUser = :uid OR recipe.createdByUser IS NULL)', { uid: userId });
    }
    if (search) {
      qb.andWhere(
        new Brackets((qb2) => {
          qb2.where('LOWER(recipe.name) LIKE :search', { search: `%${search.toLowerCase()}%` });
          qb2.orWhere('LOWER(recipe.instructions) LIKE :search', { search: `%${search.toLowerCase()}%` });
        }),
      );
    }
    return qb.getMany();
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

  findOneDetailed(id: string) {
    return this.recipeRepo.findOne({
      where: { id },
      relations: ['ingredients', 'ingredients.ingredient'],
    });
  }

  async getIngredientIdsForRecipe(recipeId: string) {
    const ris = await this.recipeIngredientRepo.find({
      where: { recipe: { id: recipeId } as any },
      relations: ['ingredient'],
    });
    return ris.map((ri) => ri.ingredient.id);
  }

  async createCustomFromExisting(input: {
    baseRecipeId: string;
    newName: string;
    mealSlot?: string;
    difficulty?: string;
    ingredientItems: { ingredientId: string; quantity: number; unit: string }[];
    createdByUserId?: string;
    instructions?: string | null;
    isSearchable?: boolean;
    source?: 'catalog' | 'user' | 'llm';
    priceEstimated?: boolean;
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
      createdByUser: input.createdByUserId ? ({ id: input.createdByUserId } as any) : base.createdByUser,
      instructions: input.instructions ?? base.instructions,
      source: input.source || (input.createdByUserId ? 'user' : 'catalog'),
      is_searchable: input.isSearchable ?? true,
      price_estimated: input.priceEstimated ?? false,
    });
    const savedRecipe = await this.recipeRepo.save(recipe);

    const ingredientIds = input.ingredientItems.map((i) => i.ingredientId);
    const ingredients = await this.ingredientsService.findByIds(ingredientIds);
    const ingredientMap = new Map(ingredients.map((ing) => [ing.id, ing]));

    const ris: RecipeIngredient[] = [];
    for (const item of input.ingredientItems) {
      const ingredient = ingredientMap.get(item.ingredientId);
      if (!ingredient) {
        throw new Error(`Ingredient not found: ${item.ingredientId}`);
      }
      const ri = this.recipeIngredientRepo.create({
        recipe: savedRecipe,
        ingredient,
        quantity: item.quantity,
        unit: item.unit,
      });
      ris.push(ri);
    }
    await this.recipeIngredientRepo.save(ris);

    const { kcal, protein, carbs, fat, cost } = this.computeMacrosAndCost(ris);
    savedRecipe.base_kcal = kcal;
    savedRecipe.base_protein = protein;
    savedRecipe.base_carbs = carbs;
    savedRecipe.base_fat = fat;
    savedRecipe.base_cost_gbp = cost;
    await this.recipeRepo.save(savedRecipe);

    return savedRecipe;
  }

  async createRecipeFromPlannedMeal(input: {
    name: string;
    mealSlot: string;
    difficulty?: string;
    userId?: string;
    instructions?: string;
    ingredients?: { ingredient_name: string; quantity: number; unit?: string }[];
    mealType?: 'solid' | 'drinkable';
    source?: 'catalog' | 'user' | 'llm';
    isSearchable?: boolean;
    priceEstimated?: boolean;
  }) {
    const recipe = this.recipeRepo.create({
      name: input.name,
      meal_slot: input.mealSlot,
      meal_type: input.mealType || 'solid',
      difficulty: input.difficulty || 'easy',
      is_custom: true,
      source: input.source || 'llm',
      is_searchable: input.isSearchable ?? false,
      price_estimated: input.priceEstimated ?? true,
      createdByUser: input.userId ? ({ id: input.userId } as any) : undefined,
      instructions: input.instructions,
    });
    const savedRecipe = await this.recipeRepo.save(recipe);

    let totalKcal = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalCost = 0;

    const ris: RecipeIngredient[] = [];
    for (const ing of input.ingredients || []) {
      if (!ing?.ingredient_name) continue;
      const ingredientEntity = await this.ingredientsService.findOrCreateByName(ing.ingredient_name);
      const quantity = Number(ing.quantity);
      const unit = ing.unit || 'g';
      const ri = this.recipeIngredientRepo.create({
        recipe: savedRecipe,
        ingredient: ingredientEntity,
        quantity,
        unit,
      });
      ris.push(ri);

      const unitType = (ingredientEntity.unit_type || '').toLowerCase();
      const divisor = unitType === 'per_ml' ? 100 : unitType === 'per_100g' ? 100 : 100;
      const factor = quantity / divisor;

      totalKcal += (Number(ingredientEntity.kcal_per_unit) || 0) * factor;
      totalProtein += (Number(ingredientEntity.protein_per_unit) || 0) * factor;
      totalCarbs += (Number(ingredientEntity.carbs_per_unit) || 0) * factor;
      totalFat += (Number(ingredientEntity.fat_per_unit) || 0) * factor;
      totalCost += (Number(ingredientEntity.estimated_price_per_unit_gbp) || 0) * factor;
    }

    if (ris.length) {
      await this.recipeIngredientRepo.save(ris);
    }

    savedRecipe.base_kcal = totalKcal;
    savedRecipe.base_protein = totalProtein;
    savedRecipe.base_carbs = totalCarbs;
    savedRecipe.base_fat = totalFat;
    savedRecipe.base_cost_gbp = totalCost;
    await this.recipeRepo.save(savedRecipe);

    return savedRecipe;
  }

  async createUserRecipe(userId: string | undefined, dto: CreateRecipeDto) {
    const recipe = this.recipeRepo.create({
      name: dto.name,
      meal_slot: dto.mealSlot || 'meal',
      difficulty: dto.difficulty || 'easy',
      is_custom: true,
      source: 'user',
      is_searchable: true,
      price_estimated: true,
      createdByUser: userId ? ({ id: userId } as any) : undefined,
      instructions: dto.instructions,
    });
    const saved = await this.recipeRepo.save(recipe);

    let totalKcal = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalCost = 0;

    const ris: RecipeIngredient[] = [];
    for (const ing of dto.ingredients || []) {
      let ingredient: Ingredient | null = null;
      if ((ing as any).ingredientId) {
        ingredient = (await this.ingredientsService.findById((ing as any).ingredientId)) as any;
      }
      if (!ingredient && ing.ingredient_name) {
        ingredient = await this.ingredientsService.findOrCreateByName(ing.ingredient_name);
      }
      if (!ingredient) continue;
      const quantity = Number(ing.quantity) || 0;
      const unit = ing.unit || 'g';
      const ri = this.recipeIngredientRepo.create({
        recipe: saved,
        ingredient,
        quantity,
        unit,
      });
      ris.push(ri);

      const unitType = (ingredient.unit_type || '').toLowerCase();
      const divisor = unitType === 'per_ml' ? 100 : unitType === 'per_100g' ? 100 : 100;
      const factor = quantity / divisor;

      totalKcal += (Number(ingredient.kcal_per_unit) || 0) * factor;
      totalProtein += (Number(ingredient.protein_per_unit) || 0) * factor;
      totalCarbs += (Number(ingredient.carbs_per_unit) || 0) * factor;
      totalFat += (Number(ingredient.fat_per_unit) || 0) * factor;
      totalCost += (Number(ingredient.estimated_price_per_unit_gbp) || 0) * factor;
    }

    if (ris.length) {
      await this.recipeIngredientRepo.save(ris);
    }

    saved.base_kcal = totalKcal;
    saved.base_protein = totalProtein;
    saved.base_carbs = totalCarbs;
    saved.base_fat = totalFat;
    saved.base_cost_gbp = totalCost;
    await this.recipeRepo.save(saved);

    return this.findOneDetailed(saved.id);
  }

  async updateUserRecipe(id: string, userId: string | undefined, dto: UpdateRecipeDto) {
    const recipe = await this.recipeRepo.findOne({
      where: { id },
      relations: ['ingredients', 'ingredients.ingredient', 'createdByUser'],
    });
    if (!recipe) {
      throw new Error('Recipe not found');
    }
    if (dto.name) recipe.name = dto.name;
    if (dto.instructions !== undefined) recipe.instructions = dto.instructions;
    if (dto.mealSlot) recipe.meal_slot = dto.mealSlot;
    if (dto.difficulty) recipe.difficulty = dto.difficulty;
    if (userId) {
      recipe.createdByUser = { id: userId } as any;
    }

    if (dto.ingredients) {
      await this.recipeIngredientRepo.delete({ recipe: { id } as any } as any);
      let totalKcal = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let totalCost = 0;
      const ris: RecipeIngredient[] = [];
      for (const ing of dto.ingredients) {
        let ingredient: Ingredient | null = null;
        if ((ing as any).ingredientId) {
          ingredient = (await this.ingredientsService.findById((ing as any).ingredientId)) as any;
        }
        if (!ingredient && ing.ingredient_name) {
          ingredient = await this.ingredientsService.findOrCreateByName(ing.ingredient_name);
        }
        if (!ingredient) continue;
        const quantity = Number(ing.quantity ?? 0);
        const unit = ing.unit || 'g';
        const ri = this.recipeIngredientRepo.create({
          recipe,
          ingredient,
          quantity,
          unit,
        });
        ris.push(ri);

        const unitType = (ingredient.unit_type || '').toLowerCase();
        const divisor = unitType === 'per_ml' ? 100 : unitType === 'per_100g' ? 100 : 100;
        const factor = quantity / divisor;

        totalKcal += (Number(ingredient.kcal_per_unit) || 0) * factor;
        totalProtein += (Number(ingredient.protein_per_unit) || 0) * factor;
        totalCarbs += (Number(ingredient.carbs_per_unit) || 0) * factor;
        totalFat += (Number(ingredient.fat_per_unit) || 0) * factor;
        totalCost += (Number(ingredient.estimated_price_per_unit_gbp) || 0) * factor;
      }
      if (ris.length) {
        await this.recipeIngredientRepo.save(ris);
      }
      recipe.base_kcal = totalKcal;
      recipe.base_protein = totalProtein;
      recipe.base_carbs = totalCarbs;
      recipe.base_fat = totalFat;
      recipe.base_cost_gbp = totalCost;
    }
    await this.recipeRepo.save(recipe);
    return this.findOneDetailed(recipe.id);
  }

  async generateRecipeFromStub(input: {
    stub: {
      name: string;
      meal_slot: string;
      meal_type?: string;
      difficulty?: string;
      base_cost_gbp?: number;
      instructions?: any;
      ingredients: { ingredient_name: string; quantity: number; unit?: string }[];
    };
    userId?: string;
  }) {
    const draft = input.stub;
    const ingList = draft.ingredients || [];
    const resolvedIngredients: Ingredient[] = [];
    for (const ing of ingList) {
      const resolved = await this.ingredientsService.findOrCreateByName(ing.ingredient_name);
      if (resolved) {
        resolvedIngredients.push(resolved);
      } else {
        this.logger.warn(`generateRecipeFromStub: could not resolve ingredient name="${ing.ingredient_name}"`);
      }
    }
    const ris: RecipeIngredient[] = [];
    for (let i = 0; i < ingList.length; i++) {
      const item = ingList[i];
      const ingredient = resolvedIngredients[i];
      if (!ingredient) continue;
      const ri = this.recipeIngredientRepo.create({
        ingredient,
        quantity: item.quantity,
        unit: item.unit || 'g',
      });
      ris.push(ri);
    }
    const mealSlot = (draft.meal_slot || 'meal').toString().slice(0, 50);
    const mealTypeRaw = (draft.meal_type as any) || 'solid';
    const mealType: 'solid' | 'drinkable' = mealTypeRaw === 'drinkable' ? 'drinkable' : 'solid';
    const recipe = this.recipeRepo.create({
      name: draft.name || `Generated meal ${Date.now()}`,
      meal_slot: mealSlot,
      meal_type: mealType,
      difficulty: draft.difficulty || 'easy',
      is_custom: true,
      source: 'llm',
      is_searchable: false,
      price_estimated: true,
      createdByUser: input.userId ? ({ id: input.userId } as any) : undefined,
      instructions:
        Array.isArray(draft.instructions)
          ? draft.instructions.join('\n')
          : typeof draft.instructions === 'object' && draft.instructions !== null
            ? JSON.stringify(draft.instructions)
            : draft.instructions || undefined,
      base_cost_gbp: draft.base_cost_gbp,
    });
    const saved = await this.recipeRepo.save(recipe);
    ris.forEach((ri) => (ri.recipe = saved));
    await this.recipeIngredientRepo.save(ris);

    const { kcal, protein, carbs, fat, cost } = this.computeMacrosAndCost(ris);
    saved.base_kcal = kcal;
    saved.base_protein = protein;
    saved.base_carbs = carbs;
    saved.base_fat = fat;
    saved.base_cost_gbp = saved.base_cost_gbp ?? cost ?? undefined;
    await this.recipeRepo.save(saved);

    return this.recipeRepo.findOne({
      where: { id: saved.id },
      relations: ['ingredients', 'ingredients.ingredient'],
    });
  }

  private computeMacrosAndCost(ris: RecipeIngredient[]) {
    let kcal = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let cost = 0;

    for (const ri of ris) {
      const ing = ri.ingredient;
      const quantity = Number(ri.quantity);
      const unitType = ing.unit_type || '';
      const unit = ri.unit || '';

      // Basic unit handling: per_100g with grams, per_piece with piece, per_ml with ml. Fallback: multiply by quantity.
      let factor = quantity;
      if (unitType === 'per_100g' && unit === 'g') {
        factor = quantity / 100;
      } else if (unitType === 'per_piece' && unit === 'piece') {
        factor = quantity;
      } else if (unitType === 'per_ml' && unit === 'ml') {
        factor = quantity / 100;
      }

      kcal += (ing.kcal_per_unit || 0) * factor;
      protein += (ing.protein_per_unit || 0) * factor;
      carbs += (ing.carbs_per_unit || 0) * factor;
      fat += (ing.fat_per_unit || 0) * factor;
      cost += (ing.estimated_price_per_unit_gbp || 0) * factor;
    }

    return { kcal, protein, carbs, fat, cost };
  }
}
