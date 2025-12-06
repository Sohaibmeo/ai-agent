import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { PlanDay, PlanMeal, WeeklyPlan, PlanActionLog, Recipe } from '../database/entities';
import { RecipesService } from '../recipes/recipes.service';
import { UsersService } from '../users/users.service';
import { calculateTargets } from './utils/profile-targets';
import { ShoppingListService } from '../shopping-list/shopping-list.service';
import { portionTowardsTarget } from './utils/selection';
import { PreferencesService } from '../preferences/preferences.service';
import { Logger } from '@nestjs/common';
import { IngredientsService } from '../ingredients/ingredients.service';
import { AgentsService } from 'agents/agents.service';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectRepository(WeeklyPlan)
    private readonly weeklyPlanRepo: Repository<WeeklyPlan>,
    @InjectRepository(PlanDay)
    private readonly planDayRepo: Repository<PlanDay>,
    @InjectRepository(PlanMeal)
    private readonly planMealRepo: Repository<PlanMeal>,
    @InjectRepository(PlanActionLog)
    private readonly planActionLogRepo: Repository<PlanActionLog>,
    private readonly recipesService: RecipesService,
    private readonly usersService: UsersService,
    private readonly shoppingListService: ShoppingListService,
    private readonly preferencesService: PreferencesService,
    private readonly ingredientsService: IngredientsService,
    private readonly agentsService: AgentsService,
  ) {}

  findAll() {
    return this.weeklyPlanRepo.find({
      where: { status: Not('systemdraft') },
      order: { week_start_date: 'DESC' },
      relations: ['days', 'days.meals', 'days.meals.recipe'],
    });
  }

  findById(id: string) {
    return this.weeklyPlanRepo.findOne({
      where: { id },
      relations: ['days', 'days.meals', 'days.meals.recipe'],
    });
  }

  async getActivePlan(userId: string) {
    const active = await this.weeklyPlanRepo.findOne({
      where: { user: { id: userId } as any, status: 'active' },
      relations: ['days', 'days.meals', 'days.meals.recipe'],
    });
    if (active) return active;
    // Fallback: latest plan by week_start_date
    const latest = await this.weeklyPlanRepo.findOne({
      where: { user: { id: userId } as any },
      order: { week_start_date: 'DESC' },
      relations: ['days', 'days.meals', 'days.meals.recipe'],
    });
    return latest;
  }

  async setStatus(planId: string, status: string) {
    const plan = await this.weeklyPlanRepo.findOne({ where: { id: planId }, relations: ['user'] });
    if (!plan) throw new Error('Plan not found');
    if (status === 'active' && plan.user?.id) {
      await this.weeklyPlanRepo.update({ user: { id: plan.user.id } as any, status: 'active' }, { status: 'archived' });
    }
    plan.status = status;
    this.logger.log(`setStatus plan=${planId} status=${status} user=${plan.user?.id}`);
    const saved = await this.weeklyPlanRepo.save(plan);
    if (status === 'active') {
      await this.shoppingListService.rebuildForPlan(planId);
    }
    return saved;
  }

  async setMealRecipe(planMealId: string, newRecipeId: string) {
    const meal = await this.planMealRepo.findOne({
      where: { id: planMealId },
      relations: ['planDay', 'planDay.weeklyPlan', 'planDay.weeklyPlan.user', 'recipe'],
    });
    if (!meal) {
      throw new Error('Plan meal not found');
    }
    const recipe = await this.recipesService.findOneById(newRecipeId);
    if (!recipe) {
      throw new Error('Recipe not found');
    }
    this.logger.log(`setMealRecipe planMeal=${planMealId} newRecipe=${newRecipeId}`);
    const userId = (meal.planDay.weeklyPlan as any).user?.id;
    const oldIngredients = (meal.recipe as any)?.ingredients?.map((ri: any) => ri.ingredient?.id).filter(Boolean) || [];

    meal.recipe = recipe as any;
    meal.meal_kcal = recipe.base_kcal;
    meal.meal_protein = recipe.base_protein;
    meal.meal_carbs = recipe.base_carbs;
    meal.meal_fat = recipe.base_fat;
    meal.meal_cost_gbp = recipe.base_cost_gbp;
    await this.planMealRepo.save(meal);

    // Preference signals: swapped out old recipe ingredients = dislike, new recipe ingredients = like.
    if (userId) {
      const newIngredients = await this.recipesService.getIngredientIdsForRecipe(newRecipeId);
      if (oldIngredients.length) {
        await this.preferencesService.incrementManyIngredients(userId, 'dislike', oldIngredients);
      }
      if (newIngredients.length) {
        await this.preferencesService.incrementManyIngredients(userId, 'like', newIngredients);
        await this.preferencesService.incrementMealPreference(userId, 'like', newRecipeId);
      }
    }

    // Recompute aggregates & shopping list
    await this.recomputeAggregates(meal.planDay.weeklyPlan.id);
    await this.shoppingListService.rebuildForPlan(meal.planDay.weeklyPlan.id);
    return this.weeklyPlanRepo.findOne({
      where: { id: meal.planDay.weeklyPlan.id },
      relations: ['days', 'days.meals', 'days.meals.recipe', 'days.meals.recipe.ingredients', 'days.meals.recipe.ingredients.ingredient'],
    });
  }

  private async createPlanDay(weeklyPlan: WeeklyPlan, dayIndex: number) {
    const day = this.planDayRepo.create({
      weeklyPlan,
      day_index: dayIndex,
    });
    return this.planDayRepo.save(day);
  }

  private async createPlanMealFromRecipe(input: {
    day: PlanDay;
    mealSlot: string;
    recipe: Recipe;
    portionMultiplier?: number;
    macroOverrides?: {
      meal_kcal?: number | null;
      meal_protein?: number | null;
      meal_carbs?: number | null;
      meal_fat?: number | null;
      meal_cost_gbp?: number | null;
    };
  }) {
    const portion = input.portionMultiplier ?? 1;
    const meal = this.planMealRepo.create({
      planDay: input.day,
      meal_slot: input.mealSlot,
      recipe: input.recipe,
      portion_multiplier: portion,
      meal_kcal:
        input.macroOverrides?.meal_kcal ??
        (input.recipe.base_kcal ? Number(input.recipe.base_kcal) * portion : undefined),
      meal_protein:
        input.macroOverrides?.meal_protein ??
        (input.recipe.base_protein ? Number(input.recipe.base_protein) * portion : undefined),
      meal_carbs:
        input.macroOverrides?.meal_carbs ??
        (input.recipe.base_carbs ? Number(input.recipe.base_carbs) * portion : undefined),
      meal_fat:
        input.macroOverrides?.meal_fat ??
        (input.recipe.base_fat ? Number(input.recipe.base_fat) * portion : undefined),
      meal_cost_gbp:
        input.macroOverrides?.meal_cost_gbp ??
        (input.recipe.base_cost_gbp ? Number(input.recipe.base_cost_gbp) * portion : undefined),
    });
    return this.planMealRepo.save(meal);
  }

  private async cloneMealsFromDay(sourceDayId: string, targetDay: PlanDay) {
    const baseMeals = await this.planMealRepo.find({
      where: { planDay: { id: sourceDayId } as any },
      relations: ['recipe'],
    });
    const createdMeals: PlanMeal[] = [];
    for (const bm of baseMeals) {
      const meal = await this.createPlanMealFromRecipe({
        day: targetDay,
        mealSlot: bm.meal_slot,
        recipe: bm.recipe,
        portionMultiplier: bm.portion_multiplier ?? 1,
        macroOverrides: {
          meal_kcal: bm.meal_kcal,
          meal_protein: bm.meal_protein,
          meal_carbs: bm.meal_carbs,
          meal_fat: bm.meal_fat,
          meal_cost_gbp: bm.meal_cost_gbp,
        },
      });
      createdMeals.push(meal);
    }
    return createdMeals;
  }

  async generateWeek(
    userId: string,
    weekStartDate: string,
    useAgent = false,
    overrides?: {
      useLlmRecipes?: boolean;
      sameMealsAllWeek?: boolean;
      weeklyBudgetGbp?: number;
      breakfast_enabled?: boolean;
      snack_enabled?: boolean;
      lunch_enabled?: boolean;
      dinner_enabled?: boolean;
      maxDifficulty?: string;
    },
  ) {
    this.logger.log(`generateWeek start user=${userId} date=${weekStartDate} useAgent=${useAgent}`);
    const profile = await this.usersService.getProfile(userId);
    if (overrides?.weeklyBudgetGbp !== undefined) {
      profile.weekly_budget_gbp = overrides.weeklyBudgetGbp;
    }
    profile.breakfast_enabled =
      overrides?.breakfast_enabled !== undefined ? overrides.breakfast_enabled : profile.breakfast_enabled;
    profile.snack_enabled = overrides?.snack_enabled !== undefined ? overrides.snack_enabled : profile.snack_enabled;
    profile.lunch_enabled = overrides?.lunch_enabled !== undefined ? overrides.lunch_enabled : profile.lunch_enabled;
    profile.dinner_enabled = overrides?.dinner_enabled !== undefined ? overrides.dinner_enabled : profile.dinner_enabled;
    if (overrides?.maxDifficulty) {
      (profile as any).max_difficulty = overrides.maxDifficulty;
    }
    const targets = calculateTargets(profile);

    const mealSlots = ['breakfast', 'snack', 'lunch', 'dinner'].filter((slot) => {
      if (slot === 'breakfast') return profile.breakfast_enabled;
      if (slot === 'snack') return profile.snack_enabled;
      if (slot === 'lunch') return profile.lunch_enabled;
      if (slot === 'dinner') return profile.dinner_enabled;
      return false;
    });

    // When useAgent is true, rely on the Day LLM to generate full recipes; otherwise use existing candidate logic.
    const plan = this.weeklyPlanRepo.create({
      user: { id: userId } as any,
      week_start_date: weekStartDate,
      status: 'systemdraft',
    });
    const savedPlan = await this.weeklyPlanRepo.save(plan);
    this.logger.log(`plan persisted id=${savedPlan.id} user=${userId}`);

    const dayEntities: PlanDay[] = [];

    for (let dayIdx = 0; dayIdx < 7; dayIdx += 1) {
      const savedDay = await this.createPlanDay(savedPlan, dayIdx);
      this.logger.log(`generateWeek day=${dayIdx} start useAgent=${useAgent}`);
      let currentDayKcal = 0;
      let currentDayProtein = 0;
      let currentDayCost = 0;

      if (useAgent) {
        if (overrides?.sameMealsAllWeek && dayIdx > 0 && dayEntities[0]) {
          this.logger.log(`generateWeek day=${dayIdx} using sameMealsAllWeek replicate day0`);
          const cloned = await this.cloneMealsFromDay(dayEntities[0].id, savedDay);
          for (const meal of cloned) {
            currentDayKcal += Number(meal.meal_kcal || 0);
            currentDayProtein += Number(meal.meal_protein || 0);
            currentDayCost += Number(meal.meal_cost_gbp || 0);
          }
        } else {
          const requiredSlots = mealSlots.length ? mealSlots : ['meal'];
          const dayPlan = await this.agentsService.generateDayPlanWithCoachLLM({
            profile,
            day_index: dayIdx,
            week_state: {
              week_start_date: weekStartDate,
              weekly_budget_gbp: overrides?.weeklyBudgetGbp ?? profile.weekly_budget_gbp,
              used_budget_gbp: 0,
              remaining_days: 7 - dayIdx,
            },
            targets: {
              daily_kcal: targets.dailyCalories,
              daily_protein: targets.dailyProtein,
            },
            meal_slots: requiredSlots,
          });
          this.logger.log(
            `generateWeek day=${dayIdx} dayGenerator meals=${dayPlan.meals?.length || 0}`,
          );
          for (const m of dayPlan.meals || []) {
            const slot =
              typeof m.meal_slot === 'string'
                ? m.meal_slot.trim().toLowerCase()
                : requiredSlots[0] || 'meal';
            if (!requiredSlots.includes(slot)) continue;

            const instructions =
              Array.isArray(m.instructions) && m.instructions.length
                ? m.instructions.join('\n')
                : typeof m.instructions === 'string'
                  ? m.instructions
                  : undefined;

            const createdRecipe = await this.recipesService.createRecipeFromPlannedMeal({
              name: m.name,
              mealSlot: slot,
              mealType: 'solid',
              difficulty: m.difficulty,
              userId,
              instructions,
              ingredients: (m.ingredients || []).map((ing) => ({
                ingredient_name: ing.ingredient_name,
                quantity: ing.quantity,
                unit: 'g',
              })),
              source: 'llm',
              isSearchable: false,
              priceEstimated: true,
            });

            const portion = 1;
            const meal = await this.createPlanMealFromRecipe({
              day: savedDay,
              mealSlot: slot,
              recipe: createdRecipe,
              portionMultiplier: portion,
            });
            currentDayKcal += Number(meal.meal_kcal || 0);
            currentDayProtein += Number(meal.meal_protein || 0);
            currentDayCost += Number(meal.meal_cost_gbp || 0);
          }
        }
      } else {
        for (const slot of mealSlots) {
          const perMealBudget =
            profile.weekly_budget_gbp && mealSlots.length
              ? Number(profile.weekly_budget_gbp) / (mealSlots.length * 7)
              : undefined;
          const chosenRecipe = await this.recipesService.generateRecipeFromLLM({
            userId,
            note: undefined,
            mealSlot: slot,
            mealType: undefined,
            difficulty: profile.max_difficulty,
            budgetPerMeal: perMealBudget,
          });
          if (!chosenRecipe) continue;
          this.logger.log(`generateWeek day=${dayIdx} slot=${slot} RecipeGenerateMethodCalled recipeId=${chosenRecipe.id}`);
          const portion = portionTowardsTarget(
            chosenRecipe,
            currentDayKcal,
            targets.dailyCalories,
            currentDayProtein,
            targets.dailyProtein,
          );
          const meal = await this.createPlanMealFromRecipe({
            day: savedDay,
            mealSlot: slot,
            recipe: chosenRecipe,
            portionMultiplier: portion,
          });
          currentDayKcal += Number(meal.meal_kcal || 0);
          currentDayProtein += Number(meal.meal_protein || 0);
          currentDayCost += Number(meal.meal_cost_gbp || 0);
        }
      }

      dayEntities.push(savedDay);
    }

    // Recompute daily/weekly aggregates
    await this.recomputeAggregates(savedPlan.id);

    await this.shoppingListService.rebuildForPlan(savedPlan.id);

    const result = await this.weeklyPlanRepo.findOne({
      where: { id: savedPlan.id },
      relations: ['days', 'days.meals', 'days.meals.recipe'],
    });
    this.logger.log(`generateWeek done id=${savedPlan.id}`);
    return result;
  }

  async recomputeAggregates(planId: string) {
    const plan = await this.weeklyPlanRepo.findOne({
      where: { id: planId },
      relations: ['days', 'days.meals'],
    });
    if (!plan || !plan.days) return;

    let weeklyKcal = 0;
    let weeklyCost = 0;
    let weeklyProtein = 0;
    let weeklyCarbs = 0;
    let weeklyFat = 0;

    for (const d of plan.days) {
      let dayKcal = 0;
      let dayCost = 0;
      let dayProtein = 0;
      let dayCarbs = 0;
      let dayFat = 0;
      for (const m of d.meals || []) {
        dayKcal += Number(m.meal_kcal || 0);
        dayCost += Number(m.meal_cost_gbp || 0);
        dayProtein += Number(m.meal_protein || 0);
        dayCarbs += Number(m.meal_carbs || 0);
        dayFat += Number(m.meal_fat || 0);
      }
      d.daily_kcal = dayKcal;
      d.daily_cost_gbp = dayCost;
      d.daily_protein = dayProtein;
      d.daily_carbs = dayCarbs;
      d.daily_fat = dayFat;
      weeklyKcal += dayKcal;
      weeklyCost += dayCost;
      weeklyProtein += dayProtein;
      weeklyCarbs += dayCarbs;
      weeklyFat += dayFat;
      await this.planDayRepo.save(d);
    }

    plan.total_kcal = weeklyKcal;
    plan.total_estimated_cost_gbp = weeklyCost;
    plan.total_protein = weeklyProtein;
    plan.total_carbs = weeklyCarbs;
    plan.total_fat = weeklyFat;
    await this.weeklyPlanRepo.save(plan);
  }

  generateDraft() {
    return { id: 'draft_plan_id', status: 'systemdraft' };
  }

  private async buildCandidatesPayload(userId: string, mealSlots: string[], maxDifficulty: string) {
    const days: any[] = [];
    const profile = await this.usersService.getProfile(userId);
    for (let dayIdx = 0; dayIdx < 7; dayIdx += 1) {
      const day: any = { day_index: dayIdx, meals: [] };
      for (const slot of mealSlots) {
        const candidates = await this.recipesService.findCandidatesForUser({
          userId,
          mealSlot: slot,
          maxDifficulty,
          weeklyBudgetGbp: profile.weekly_budget_gbp ? Number(profile.weekly_budget_gbp) : undefined,
          mealsPerDay: mealSlots.length,
        });
        day.meals.push({
          meal_slot: slot,
          candidates: candidates.map((r) => ({ id: r.id, name: r.name, meal_slot: r.meal_slot })),
        });
      }
      days.push(day);
    }
    return { days };
  }

  async saveCustomRecipe(
    planMealId: string,
    newName: string,
    ingredientItems: { ingredientId: string; quantity: number; unit: string }[],
  ) {
    const meal = await this.planMealRepo.findOne({
      where: { id: planMealId },
      relations: ['planDay', 'planDay.weeklyPlan', 'planDay.weeklyPlan.user', 'recipe'],
    });
    if (!meal?.planDay?.weeklyPlan?.id) {
      throw new Error('Plan meal not found');
    }
    const userId = (meal.planDay.weeklyPlan as any).user?.id;
    const customRecipe = await this.recipesService.createCustomFromExisting({
      baseRecipeId: meal.recipe?.id || '',
      newName,
      mealSlot: meal.meal_slot,
      difficulty: meal.recipe?.difficulty,
      ingredientItems,
      createdByUserId: userId,
      source: 'user',
      isSearchable: true,
    });

    meal.recipe = customRecipe as any;
    meal.meal_kcal = customRecipe.base_kcal;
    meal.meal_protein = customRecipe.base_protein;
    meal.meal_carbs = customRecipe.base_carbs;
    meal.meal_fat = customRecipe.base_fat;
    meal.meal_cost_gbp = customRecipe.base_cost_gbp;
    await this.planMealRepo.save(meal);
    await this.recomputeAggregates(meal.planDay.weeklyPlan.id);
    await this.shoppingListService.rebuildForPlan(meal.planDay.weeklyPlan.id);
    await this.logAction({
      weeklyPlanId: meal.planDay.weeklyPlan.id,
      userId,
      action: 'save_custom_recipe',
      metadata: { planMealId, recipeId: customRecipe.id },
      success: true,
    });
    return this.weeklyPlanRepo.findOne({
      where: { id: meal.planDay.weeklyPlan.id },
      relations: ['days', 'days.meals', 'days.meals.recipe'],
    });
  }

  private async regenerateWeek(userId: string, plan: WeeklyPlan) {
    for (const day of plan.days || []) {
      await this.regenerateDay(userId, plan, day.id);
    }
  }

  private async regenerateDay(userId: string, plan: WeeklyPlan, planDayId: string) {
    const day = (plan.days || []).find((d) => d.id === planDayId);
    if (!day) return;
    for (const meal of day.meals || []) {
      await this.regenerateMeal(meal.id, { userId });
    }
  }

  async regenerateMeal(
    planMealId: string,
    opts?: {
      userId?: string;
      params?: { preferMealType?: 'solid' | 'drinkable' };
      note?: string;
    },
  ) {
    const meal = await this.planMealRepo.findOne({
      where: { id: planMealId },
      relations: ['planDay', 'planDay.meals', 'planDay.weeklyPlan', 'planDay.weeklyPlan.user', 'recipe'],
    });
    if (!meal) return;
    const userId = opts?.userId || (meal.planDay.weeklyPlan as any)?.user?.id;
    if (!userId) {
      throw new Error('userId is required to regenerate a meal');
    }
    const profile = await this.usersService.getProfile(userId);
    const mealsPerDay = Array.isArray(meal.planDay?.meals) && meal.planDay.meals.length ? meal.planDay.meals.length : 4;
    const budgetPerMeal =
      profile.weekly_budget_gbp && mealsPerDay
        ? Number(profile.weekly_budget_gbp) / Math.max(1, mealsPerDay * 7)
        : undefined;

    const generated = await this.recipesService.generateRecipeFromLLM({
      userId,
      note: opts?.note,
      mealSlot: meal.meal_slot,
      mealType: opts?.params?.preferMealType,
      difficulty: profile.max_difficulty,
      budgetPerMeal,
    });
    if (!generated?.id) return;

    meal.recipe = generated as any;
    const portion = Number(meal.portion_multiplier || 1);
    meal.meal_kcal = generated.base_kcal ? Number(generated.base_kcal) * portion : meal.meal_kcal;
    meal.meal_protein = generated.base_protein ? Number(generated.base_protein) * portion : meal.meal_protein;
    meal.meal_carbs = generated.base_carbs ? Number(generated.base_carbs) * portion : meal.meal_carbs;
    meal.meal_fat = generated.base_fat ? Number(generated.base_fat) * portion : meal.meal_fat;
    meal.meal_cost_gbp = generated.base_cost_gbp ? Number(generated.base_cost_gbp) * portion : meal.meal_cost_gbp;
    await this.planMealRepo.save(meal);
  }

  private async logAction(entry: {
    weeklyPlanId: string;
    userId?: string;
    action: string;
    metadata?: Record<string, any>;
    success: boolean;
    error_message?: string;
  }) {
    await this.planActionLogRepo.save({
      weeklyPlan: { id: entry.weeklyPlanId } as any,
      user_id: entry.userId || null,
      action: entry.action,
      metadata: entry.metadata,
      success: entry.success,
      error_message: entry.error_message,
    });
  }

  private async swapIngredient(
    planMealId: string,
    ingredientIdentifierToRemove?: string | null,
    ingredientIdentifierToAdd?: string | null,
  ) {
    const meal = await this.planMealRepo.findOne({
      where: { id: planMealId },
      relations: ['recipe', 'recipe.ingredients', 'recipe.ingredients.ingredient', 'planDay', 'planDay.weeklyPlan'],
    });
    if (!meal || !meal.recipe) return;
    const recipe = meal.recipe as any;
    const baseIngredients = recipe.ingredients || [];
    const uuidRegex = /^[0-9a-fA-F-]{36}$/;

    let removeIdTarget: string | undefined;
    if (ingredientIdentifierToRemove && ingredientIdentifierToRemove.trim()) {
      const trimmed = ingredientIdentifierToRemove.trim();
      if (uuidRegex.test(trimmed)) {
        removeIdTarget = trimmed;
      } else {
        const resolved = await this.ingredientsService.findOrCreateByName(trimmed);
        removeIdTarget = resolved?.id;
      }
    }

    let addIngredientId: string | undefined;
    if (ingredientIdentifierToAdd && ingredientIdentifierToAdd.trim()) {
      const trimmed = ingredientIdentifierToAdd.trim();
      if (uuidRegex.test(trimmed)) {
        const ing = await this.ingredientsService.findById(trimmed);
        if (!ing) {
          throw new Error(`Ingredient not found for id=${trimmed}`);
        }
        addIngredientId = ing.id;
      } else {
        const ing = await this.ingredientsService.findOrCreateByName(trimmed);
        addIngredientId = ing.id;
      }
    }

    const filteredIngredients = removeIdTarget
      ? baseIngredients.filter((ri: any) => String(ri.ingredient?.id) !== removeIdTarget)
      : baseIngredients;

    if (removeIdTarget && filteredIngredients.length === baseIngredients.length) {
      throw new Error(`No ingredient matched removal target ${removeIdTarget}`);
    }

    // Create a custom recipe clone
    const ingredientItems = filteredIngredients
      .filter((ri: any) => ri.ingredient?.id)
      .map((ri: any) => ({
        ingredientId: String(ri.ingredient.id),
        quantity: Number(ri.quantity || 0),
        unit: ri.unit || '',
      }))
      .concat(
        addIngredientId
          ? [
              {
                ingredientId: addIngredientId,
                quantity: 1,
                unit: 'piece',
              },
            ]
          : [],
      );

    const cloned = await this.recipesService.createCustomFromExisting({
      baseRecipeId: recipe.id,
      newName: `${recipe.name} (custom swap)`,
      ingredientItems,
    });
    await this.setMealRecipe(meal.id, cloned.id);
  }
}
