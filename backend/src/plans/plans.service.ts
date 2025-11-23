import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanDay, PlanMeal, WeeklyPlan } from '../database/entities';
import { RecipesService } from '../recipes/recipes.service';
import { UsersService } from '../users/users.service';
import { calculateTargets } from './utils/profile-targets';
import { ShoppingListService } from '../shopping-list/shopping-list.service';
import { portionTowardsTarget, selectRecipe } from './utils/selection';
import { PreferencesService } from '../preferences/preferences.service';
import { AgentsService } from '../agents/agents.service';
import { Logger } from '@nestjs/common';
import { ReviewInstruction } from '../agents/schemas/review-instruction.schema';

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
    private readonly recipesService: RecipesService,
    private readonly usersService: UsersService,
    private readonly shoppingListService: ShoppingListService,
    private readonly preferencesService: PreferencesService,
    private readonly agentsService: AgentsService,
  ) {}

  findAll() {
    return this.weeklyPlanRepo.find({ relations: ['days', 'days.meals'] });
  }

  findById(id: string) {
    return this.weeklyPlanRepo.findOne({
      where: { id },
      relations: ['days', 'days.meals', 'days.meals.recipe'],
    });
  }

  async getActivePlan(userId: string) {
    return this.weeklyPlanRepo.findOne({
      where: { user: { id: userId } as any, status: 'active' },
      relations: ['days', 'days.meals', 'days.meals.recipe'],
    });
  }

  async setStatus(planId: string, status: string) {
    const plan = await this.weeklyPlanRepo.findOne({ where: { id: planId }, relations: ['user'] });
    if (!plan) throw new Error('Plan not found');
    if (status === 'active' && plan.user?.id) {
      await this.weeklyPlanRepo.update({ user: { id: plan.user.id } as any, status: 'active' }, { status: 'archived' });
    }
    plan.status = status;
    this.logger.log(`setStatus plan=${planId} status=${status} user=${plan.user?.id}`);
    return this.weeklyPlanRepo.save(plan);
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
      relations: ['days', 'days.meals', 'days.meals.recipe'],
    });
  }

  async generateWeek(userId: string, weekStartDate: string, useAgent = false) {
    this.logger.log(`generateWeek start user=${userId} date=${weekStartDate} useAgent=${useAgent}`);
    const profile = await this.usersService.getProfile(userId);
    const targets = calculateTargets(profile);

    const mealSlots = ['breakfast', 'snack', 'lunch', 'dinner'].filter((slot) => {
      if (slot === 'breakfast') return profile.breakfast_enabled;
      if (slot === 'snack') return profile.snack_enabled;
      if (slot === 'lunch') return profile.lunch_enabled;
      if (slot === 'dinner') return profile.dinner_enabled;
      return false;
    });

    // For now pick first candidate per slot per day; later integrate Coach Agent.
    const plan = this.weeklyPlanRepo.create({
      user: { id: userId } as any,
      week_start_date: weekStartDate,
      status: 'draft',
    });
    const savedPlan = await this.weeklyPlanRepo.save(plan);
    this.logger.log(`plan persisted id=${savedPlan.id} user=${userId}`);

    const dayEntities: PlanDay[] = [];
    let agentPlan:
      | { week_start_date?: string; days?: { day_index: number; meals: any[] }[] }
      | undefined;
    if (useAgent) {
      try {
        const candidatesPayload = await this.buildCandidatesPayload(userId, mealSlots, profile.max_difficulty);
        agentPlan = await this.agentsService.coachPlan({
          profile,
          candidates: candidatesPayload,
          week_start_date: weekStartDate,
        });
        this.logger.log(`coachPlan succeeded user=${userId}`);
      } catch (e) {
        this.logger.warn(`coachPlan failed user=${userId} fallback to heuristic`);
        agentPlan = undefined;
      }
    }

    for (let dayIdx = 0; dayIdx < 7; dayIdx += 1) {
      const day = this.planDayRepo.create({
        weeklyPlan: savedPlan,
        day_index: dayIdx,
      });
      const savedDay = await this.planDayRepo.save(day);
      let currentDayKcal = 0;
      let currentDayProtein = 0;

      const agentMealsForDay = agentPlan?.days?.find((d) => d.day_index === dayIdx)?.meals;
      if (agentMealsForDay?.length) {
        for (const m of agentMealsForDay) {
          const recipe = m.recipe_id ? await this.recipesService.findOneById(m.recipe_id) : null;
          if (!recipe) continue;
          const portion = m.portion_multiplier ?? 1;
          const meal = this.planMealRepo.create({
            planDay: savedDay,
            meal_slot: m.meal_slot,
            recipe,
            portion_multiplier: portion,
            meal_kcal: recipe.base_kcal ? Number(recipe.base_kcal) * portion : undefined,
            meal_protein: recipe.base_protein ? Number(recipe.base_protein) * portion : undefined,
            meal_carbs: recipe.base_carbs ? Number(recipe.base_carbs) * portion : undefined,
            meal_fat: recipe.base_fat ? Number(recipe.base_fat) * portion : undefined,
            meal_cost_gbp: recipe.base_cost_gbp ? Number(recipe.base_cost_gbp) * portion : undefined,
          });
          await this.planMealRepo.save(meal);
          currentDayKcal += Number(meal.meal_kcal || 0);
          currentDayProtein += Number(meal.meal_protein || 0);
        }
      } else {
        for (const slot of mealSlots) {
          const candidates = await this.recipesService.findCandidatesForUser({
            userId,
            mealSlot: slot,
            maxDifficulty: profile.max_difficulty,
          });
          const selected = selectRecipe(candidates, {
            avoidNames: new Set(), // could track weekly variety
            costCapPerMeal: profile.weekly_budget_gbp
              ? Number(profile.weekly_budget_gbp) / (mealSlots.length * 7)
              : undefined,
          });
          if (!selected) continue;
          const portion = portionTowardsTarget(
            selected,
            currentDayKcal,
            targets.dailyCalories,
            currentDayProtein,
            targets.dailyProtein,
          );
          const meal = this.planMealRepo.create({
            planDay: savedDay,
            meal_slot: slot,
            recipe: selected,
            portion_multiplier: portion,
            meal_kcal: selected.base_kcal ? Number(selected.base_kcal) * portion : undefined,
            meal_protein: selected.base_protein ? Number(selected.base_protein) * portion : undefined,
            meal_carbs: selected.base_carbs ? Number(selected.base_carbs) * portion : undefined,
            meal_fat: selected.base_fat ? Number(selected.base_fat) * portion : undefined,
            meal_cost_gbp: selected.base_cost_gbp ? Number(selected.base_cost_gbp) * portion : undefined,
          });
          await this.planMealRepo.save(meal);
          currentDayKcal += Number(meal.meal_kcal || 0);
          currentDayProtein += Number(meal.meal_protein || 0);
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

    for (const d of plan.days) {
      let dayKcal = 0;
      let dayCost = 0;
      for (const m of d.meals || []) {
        dayKcal += Number(m.meal_kcal || 0);
        dayCost += Number(m.meal_cost_gbp || 0);
      }
      d.daily_kcal = dayKcal;
      d.daily_cost_gbp = dayCost;
      weeklyKcal += dayKcal;
      weeklyCost += dayCost;
      await this.planDayRepo.save(d);
    }

    plan.total_kcal = weeklyKcal;
    plan.total_estimated_cost_gbp = weeklyCost;
    await this.weeklyPlanRepo.save(plan);
  }

  generateDraft() {
    return { id: 'draft_plan_id', status: 'draft' };
  }

  private async buildCandidatesPayload(userId: string, mealSlots: string[], maxDifficulty: string) {
    const days: any[] = [];
    for (let dayIdx = 0; dayIdx < 7; dayIdx += 1) {
      const day: any = { day_index: dayIdx, meals: [] };
      for (const slot of mealSlots) {
        const candidates = await this.recipesService.findCandidatesForUser({
          userId,
          mealSlot: slot,
          maxDifficulty,
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

  // --- Actions orchestration (moved from orchestrator) ---
  async applyAction(weeklyPlanId: string, payload: { actionContext: any; reasonText?: string; userId?: string }) {
    const plan = await this.weeklyPlanRepo.findOne({
      where: { id: weeklyPlanId },
      relations: ['user', 'days', 'days.meals', 'days.meals.recipe'],
    });
    if (!plan) {
      throw new Error('Weekly plan not found');
    }
    const userId = payload.userId || (plan.user as any)?.id;
    if (!userId) {
      throw new Error('userId is required on plan or payload');
    }
    const profile = await this.usersService.getProfile(userId);
    const reviewInstruction = await this.agentsService.reviewAction({
      userId,
      weeklyPlanId,
      actionContext: payload.actionContext,
      reasonText: payload.reasonText,
      profileSnippet: {
        goal: profile.goal,
        dietType: profile.diet_type,
        weeklyBudgetGbp: profile.weekly_budget_gbp,
      },
      currentPlanSummary: this.buildPlanSummary(plan),
    });
    this.logger.log(
      `Plan action resolved user=${userId} plan=${weeklyPlanId} action=${reviewInstruction.action} target=${reviewInstruction.targetLevel}`,
    );
    await this.handleInstruction(userId, plan, reviewInstruction);
    return this.weeklyPlanRepo.findOne({
      where: { id: weeklyPlanId },
      relations: ['days', 'days.meals', 'days.meals.recipe'],
    });
  }

  private buildPlanSummary(plan: WeeklyPlan) {
    return {
      week_start_date: plan.week_start_date,
      days: (plan.days || []).map((d) => ({
        id: d.id,
        day_index: d.day_index,
        meals: (d.meals || []).map((m) => ({
          id: m.id,
          meal_slot: m.meal_slot,
          recipe_id: m.recipe?.id,
          recipe_name: m.recipe?.name,
        })),
      })),
    };
  }

  private async handleInstruction(userId: string, plan: WeeklyPlan, instruction: ReviewInstruction) {
    switch (instruction.action) {
      case 'regenerate_week':
        await this.regenerateWeek(userId, plan);
        break;
      case 'regenerate_day':
        if (instruction.targetIds?.planDayId) {
          await this.regenerateDay(userId, plan, instruction.targetIds.planDayId);
        }
        break;
      case 'regenerate_meal':
        if (instruction.targetIds?.planMealId) {
          await this.regenerateMeal(userId, instruction.targetIds.planMealId);
        }
        break;
      case 'avoid_ingredient_future':
        if (instruction.targetIds?.ingredientId) {
          await this.preferencesService.incrementIngredientPreference(
            userId,
            'dislike',
            instruction.targetIds.ingredientId,
          );
        }
        break;
      case 'adjust_portion':
        if (instruction.targetIds?.planMealId) {
          await this.adjustPortion(instruction.targetIds.planMealId, instruction.params);
        }
        break;
      case 'change_meal_type':
        if (instruction.targetIds?.planMealId) {
          await this.regenerateMeal(userId, instruction.targetIds.planMealId, instruction.params);
        }
        break;
      case 'swap_ingredient':
      case 'remove_ingredient':
      default:
        this.logger.warn(`Action ${instruction.action} not yet implemented; no-op`);
        break;
    }
    await this.recomputeAggregates(plan.id);
    await this.shoppingListService.rebuildForPlan(plan.id);
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
      await this.regenerateMeal(userId, meal.id);
    }
  }

  private async regenerateMeal(userId: string, planMealId: string, params?: ReviewInstruction['params']) {
    const meal = await this.planMealRepo.findOne({
      where: { id: planMealId },
      relations: ['planDay', 'planDay.weeklyPlan', 'recipe'],
    });
    if (!meal) return;
    const profile = await this.usersService.getProfile(userId);
    const candidates = await this.recipesService.findCandidatesForUser({
      userId,
      mealSlot: meal.meal_slot,
      maxDifficulty: profile.max_difficulty,
    });
    const filtered = candidates.filter((r) => r.id !== meal.recipe?.id);
    const pick = selectRecipe(filtered.length ? filtered : candidates, {
      costCapPerMeal: profile.weekly_budget_gbp
        ? Number(profile.weekly_budget_gbp) / Math.max(1, 4 * 7)
        : undefined,
    });
    if (pick && pick.id) {
      await this.setMealRecipe(meal.id, pick.id);
    }
  }

  private async adjustPortion(planMealId: string, params?: ReviewInstruction['params']) {
    const meal = await this.planMealRepo.findOne({
      where: { id: planMealId },
      relations: ['recipe', 'planDay', 'planDay.weeklyPlan'],
    });
    if (!meal) return;
    const base = Number(meal.portion_multiplier || 1);
    const factor = params?.smallerPortion ? 0.9 : params?.largerPortion ? 1.1 : 1;
    const next = Math.max(0.5, Math.min(2, base * factor));
    meal.portion_multiplier = Number(next.toFixed(2));
    const recipe = meal.recipe;
    meal.meal_kcal = recipe.base_kcal ? Number(recipe.base_kcal) * meal.portion_multiplier : meal.meal_kcal;
    meal.meal_protein = recipe.base_protein ? Number(recipe.base_protein) * meal.portion_multiplier : meal.meal_protein;
    meal.meal_carbs = recipe.base_carbs ? Number(recipe.base_carbs) * meal.portion_multiplier : meal.meal_carbs;
    meal.meal_fat = recipe.base_fat ? Number(recipe.base_fat) * meal.portion_multiplier : meal.meal_fat;
    meal.meal_cost_gbp = recipe.base_cost_gbp
      ? Number(recipe.base_cost_gbp) * meal.portion_multiplier
      : meal.meal_cost_gbp;
    await this.planMealRepo.save(meal);
  }
}
