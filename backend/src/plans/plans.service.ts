import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanDay, PlanMeal, WeeklyPlan } from '../database/entities';
import { RecipesService } from '../recipes/recipes.service';
import { UsersService } from '../users/users.service';
import { calculateTargets } from './utils/profile-targets';
import { ShoppingListService } from '../shopping-list/shopping-list.service';

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
        const recipe = candidates[0];
        if (!recipe) continue;
        const meal = this.planMealRepo.create({
          planDay: savedDay,
          meal_slot: slot,
          recipe,
          portion_multiplier: 1,
          meal_kcal: recipe.base_kcal,
          meal_protein: recipe.base_protein,
          meal_carbs: recipe.base_carbs,
          meal_fat: recipe.base_fat,
          meal_cost_gbp: recipe.base_cost_gbp,
        });
        await this.planMealRepo.save(meal);
      }

      dayEntities.push(savedDay);
    }

    // Recompute daily/weekly aggregates
    const daysWithMeals = await this.planDayRepo.find({
      where: { weeklyPlan: { id: savedPlan.id } },
      relations: ['meals', 'meals.recipe'],
    });

    let weeklyKcal = 0;
    let weeklyCost = 0;
    for (const d of daysWithMeals) {
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
    savedPlan.total_kcal = weeklyKcal;
    savedPlan.total_estimated_cost_gbp = weeklyCost;
    await this.weeklyPlanRepo.save(savedPlan);

    await this.shoppingListService.rebuildForPlan(savedPlan.id);

    return this.weeklyPlanRepo.findOne({
      where: { id: savedPlan.id },
      relations: ['days', 'days.meals', 'days.meals.recipe'],
    });
  }

  generateDraft() {
    return { id: 'draft_plan_id', status: 'draft' };
  }
}
