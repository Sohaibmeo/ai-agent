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

  findOneDetailed(id: string) {
    return this.recipeRepo.findOne({
      where: { id },
      relations: ['ingredients', 'ingredients.ingredient'],
    });
  }

  async findCandidatesForUser(query: RecipeCandidatesQueryDto) {
    this.logger.log(
      `findCandidates user=${query.userId} slot=${query.mealSlot ?? 'any'} type=${query.mealType ?? 'any'}`,
    );
    const profile = await this.usersService.getProfile(query.userId);
    const weeklyBudget = query.weeklyBudgetGbp ?? (profile.weekly_budget_gbp ? Number(profile.weekly_budget_gbp) : undefined);
    const mealsPerDay = query.mealsPerDay || 4;
    const dailyBudget = weeklyBudget ? weeklyBudget / 7 : undefined;
    const perMealBudget = dailyBudget ? dailyBudget / Math.max(1, mealsPerDay) : undefined;
    const estimatedDayCost = query.estimatedDayCost ? Number(query.estimatedDayCost) : 0;

    const allowedDifficulty = this.allowedDifficulties(query.maxDifficulty || profile.max_difficulty);
    const qb = this.recipeRepo.createQueryBuilder('recipe');

    if (query.mealSlot) {
      qb.andWhere('recipe.meal_slot = :mealSlot', { mealSlot: query.mealSlot });
    }

    if (query.mealType) {
      qb.andWhere('recipe.meal_type = :mealType', { mealType: query.mealType });
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

    if (!query.includeNonSearchable) {
      qb.andWhere('recipe.is_searchable = true');
    }

    qb.limit(10);

    // Join recipe scores for ranking
    qb.leftJoin(UserRecipeScore, 'urs', 'urs.recipe_id = recipe.id AND urs.user_id = :userId', {
      userId: query.userId,
    })
      .addSelect('COALESCE(urs.score, 0)', 'recipe_score')
      .addSelect(
        `(SELECT COALESCE(SUM(uis.score), 0)
          FROM recipe_ingredients ri
          LEFT JOIN user_ingredient_score uis
            ON uis.ingredient_id = ri.ingredient_id
           AND uis.user_id = :userId
         WHERE ri.recipe_id = recipe.id)`,
        'ingredient_penalty_raw',
      )
      .orderBy('recipe_score', 'DESC');

    const rawAndEntities = (qb as any).getRawAndEntities
      ? await (qb as any).getRawAndEntities()
      : { entities: await qb.getMany(), raw: [] as any[] };
    const entities = rawAndEntities.entities as Recipe[];
    const raw = rawAndEntities.raw || [];
    const scored = entities.map((recipe, idx) => {
      const recipeScore = Number(raw[idx]?.recipe_score ?? 0);
      const ingredientPenaltyRaw = Number(raw[idx]?.ingredient_penalty_raw ?? 0);
      const ingredientPenalty = ingredientPenaltyRaw < 0 ? Math.abs(ingredientPenaltyRaw) : 0;
      const cost = Number(recipe.base_cost_gbp || 0);
      let costPenalty = 0;
      if (perMealBudget && cost) {
        if (cost > perMealBudget * 1.3) costPenalty += 2;
        else if (cost > perMealBudget) costPenalty += 1;
      }
      if (dailyBudget && estimatedDayCost && cost) {
        const projected = estimatedDayCost + cost;
        if (projected > dailyBudget * 1.3) costPenalty += 2;
        else if (projected > dailyBudget) costPenalty += 1;
      }
      const score = recipeScore - ingredientPenalty - costPenalty;
      return { recipe, score, costPenalty, recipeScore, ingredientPenalty };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Number(a.recipe.base_cost_gbp || 0) - Number(b.recipe.base_cost_gbp || 0);
    });

    const ordered = scored.map((s) => s.recipe);
    this.logger.log(`candidates user=${query.userId} count=${ordered.length}`);
    return ordered;
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

  async generateRecipeFromLLM(input: GenerateRecipeDto) {
    this.logger.log(`generateRecipe user=${input.userId} slot=${input.mealSlot ?? 'any'}`);
    const draft = await this.agentsService.generateRecipe({
      note: input.note,
      meal_slot: input.mealSlot,
      meal_type: input.mealType,
      difficulty: input.difficulty,
      budget_per_meal: input.budgetPerMeal,
    });

    const instructions =
      Array.isArray(draft.instructions)
        ? draft.instructions.join('\n')
        : typeof draft.instructions === 'object' && draft.instructions !== null
          ? JSON.stringify(draft.instructions)
          : draft.instructions || null;

    // Resolve ingredients
    const ingList = draft.ingredients || [];
    const resolvedIngredients: Ingredient[] = [];
    for (const ing of ingList) {
      const resolved = await this.ingredientsService.resolveOrCreateLoose(ing.ingredient_name);
      if (resolved) {
        resolvedIngredients.push(resolved);
      } else {
        this.logger.warn(`generateRecipe: could not resolve ingredient name="${ing.ingredient_name}"`);
      }
    }

    // Build ris
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

    const mealSlot = (draft.meal_slot || input.mealSlot || 'meal').toString().slice(0, 50);
    const mealTypeRaw = (draft.meal_type as any) || input.mealType || 'solid';
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
      instructions: instructions || undefined,
    });
    const saved = await this.recipeRepo.save(recipe);
    ris.forEach((ri) => (ri.recipe = saved));
    await this.recipeIngredientRepo.save(ris);

    const { kcal, protein, carbs, fat, cost } = this.computeMacrosAndCost(ris);
    saved.base_kcal = kcal;
    saved.base_protein = protein;
    saved.base_carbs = carbs;
    saved.base_fat = fat;
    const costClamp = draft.base_cost_gbp ? Math.min(Number(draft.base_cost_gbp), 50) : undefined;
    saved.base_cost_gbp = costClamp || cost || undefined;
    saved.price_estimated = true;
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
