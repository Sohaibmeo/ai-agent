import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanDay, PlanMeal, WeeklyPlan } from '../database/entities';
import { RecipesService } from '../recipes/recipes.service';
import { UsersService } from '../users/users.service';
import { calculateTargets } from './utils/profile-targets';
import { ShoppingListService } from '../shopping-list/shopping-list.service';
import { portionTowardsTarget, selectRecipe } from './utils/selection';

@Injectable()
export class PlansService {
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
    const plan = await this.weeklyPlanRepo.findOne({ where: { id: planId } });
    if (!plan) throw new Error('Plan not found');
    plan.status = status;
    await this.weeklyPlanRepo.save(plan);
    return plan;
  }

  async setMealRecipe(planMealId: string, newRecipeId: string) {
    const meal = await this.planMealRepo.findOne({
      where: { id: planMealId },
      relations: ['planDay', 'planDay.weeklyPlan'],
    });
    if (!meal) {
      throw new Error('Plan meal not found');
    }
    const recipe = await this.recipesService.findOneById(newRecipeId);
    if (!recipe) {
      throw new Error('Recipe not found');
    }
    meal.recipe = recipe as any;
    meal.meal_kcal = recipe.base_kcal;
    meal.meal_protein = recipe.base_protein;
    meal.meal_carbs = recipe.base_carbs;
    meal.meal_fat = recipe.base_fat;
    meal.meal_cost_gbp = recipe.base_cost_gbp;
    await this.planMealRepo.save(meal);

    // Recompute aggregates & shopping list
    await this.recomputeAggregates(meal.planDay.weeklyPlan.id);
    await this.shoppingListService.rebuildForPlan(meal.planDay.weeklyPlan.id);
    return this.weeklyPlanRepo.findOne({
      where: { id: meal.planDay.weeklyPlan.id },
      relations: ['days', 'days.meals', 'days.meals.recipe'],
    });
  }

  async generateWeek(userId: string, weekStartDate: string) {
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

    const dayEntities: PlanDay[] = [];
    for (let dayIdx = 0; dayIdx < 7; dayIdx += 1) {
      const day = this.planDayRepo.create({
        weeklyPlan: savedPlan,
        day_index: dayIdx,
      });
      const savedDay = await this.planDayRepo.save(day);

      for (const slot of mealSlots) {
        const candidates = await this.recipesService.findCandidatesForUser({
          userId,
          mealSlot: slot,
          maxDifficulty: profile.max_difficulty,
        });
        const selected = selectRecipe(candidates, {
          avoidNames: new Set(), // could track weekly variety
          budgetCap: profile.weekly_budget_gbp || undefined,
        });
        if (!selected) continue;
        const portion = portionTowardsTarget(selected, day.daily_kcal || 0, targets.dailyCalories);
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
      }

      dayEntities.push(savedDay);
    }

    // Recompute daily/weekly aggregates
    await this.recomputeAggregates(savedPlan.id);

    await this.shoppingListService.rebuildForPlan(savedPlan.id);

    return this.weeklyPlanRepo.findOne({
      where: { id: savedPlan.id },
      relations: ['days', 'days.meals', 'days.meals.recipe'],
    });
  }

  private async recomputeAggregates(planId: string) {
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
}
