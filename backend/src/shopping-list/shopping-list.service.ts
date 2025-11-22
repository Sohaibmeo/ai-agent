import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Ingredient,
  PlanMeal,
  RecipeIngredient,
  ShoppingListItem,
  PantryItem,
  UserIngredientPrice,
} from '../database/entities';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class ShoppingListService {
  constructor(
    @InjectRepository(ShoppingListItem)
    private readonly shoppingListRepo: Repository<ShoppingListItem>,
    @InjectRepository(PantryItem)
    private readonly pantryRepo: Repository<PantryItem>,
    @InjectRepository(UserIngredientPrice)
    private readonly priceRepo: Repository<UserIngredientPrice>,
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  getForPlan(planId: string) {
    return this.shoppingListRepo.find({
      where: { weeklyPlan: { id: planId } },
    });
  }

  async rebuildForPlan(planId: string) {
    // Clear existing
    await this.shoppingListRepo.delete({ weeklyPlan: { id: planId } as any });

    // Aggregate ingredients across plan meals
    const meals = await this.entityManager.find(PlanMeal, {
      where: { planDay: { weeklyPlan: { id: planId } } as any },
      relations: ['recipe'],
    });
    if (!meals.length) return [];

    // Load recipe ingredients for all recipes in plan
    const recipeIds = meals.map((m) => m.recipe.id);
    const recipeIngredients = await this.entityManager
      .getRepository(RecipeIngredient)
      .createQueryBuilder('ri')
      .innerJoinAndSelect('ri.ingredient', 'ingredient')
      .where('ri.recipe_id IN (:...recipeIds)', { recipeIds })
      .getMany();

    const totals = new Map<
      string,
      { ingredient: Ingredient; quantity: number; unit: string; costPerUnit?: number }
    >();

    for (const meal of meals) {
      const portion = Number(meal.portion_multiplier || 1);
      const ris = recipeIngredients.filter((ri) => ri.recipe.id === meal.recipe.id);
      for (const ri of ris) {
        const key = ri.ingredient.id;
        const current = totals.get(key);
        const quantity = Number(ri.quantity) * portion;
        if (current) {
          current.quantity += quantity;
        } else {
          totals.set(key, {
            ingredient: ri.ingredient,
            quantity,
            unit: ri.unit,
            costPerUnit: ri.ingredient.estimated_price_per_unit_gbp
              ? Number(ri.ingredient.estimated_price_per_unit_gbp)
              : undefined,
          });
        }
      }
    }

    // Apply user price overrides and pantry flags
    const userId = meals[0].planDay.weeklyPlan.user.id;
    const overrides = await this.priceRepo.find({ where: { user: { id: userId } as any } });
    const overrideMap = new Map(overrides.map((o) => [o.ingredient.id, Number(o.price_per_unit_gbp)]));
    const pantry = await this.pantryRepo.find({ where: { user: { id: userId } as any } });
    const pantryMap = new Map(pantry.map((p) => [p.ingredient.id, p.has_item]));

    const toSave: Partial<ShoppingListItem>[] = [];
    for (const [, val] of totals) {
      const pricePerUnit = overrideMap.get(val.ingredient.id) ?? val.costPerUnit;
      const estimatedCost = pricePerUnit ? pricePerUnit * val.quantity : undefined;
      const hasInPantry = pantryMap.get(val.ingredient.id) ?? false;
      toSave.push({
        weeklyPlan: { id: planId } as any,
        ingredient: val.ingredient,
        total_quantity: val.quantity,
        unit: val.unit,
        estimated_cost_gbp: estimatedCost,
        // @ts-expect-error extra runtime flag not in entity
        hasInPantry,
      });
    }

    await this.shoppingListRepo.save(toSave);
    return this.getForPlan(planId);
  }

  async getActive(userId: string, planId?: string) {
    let targetPlanId = planId;
    if (!targetPlanId) {
      const plan = await this.entityManager.findOne(PlanMeal, {
        relations: ['planDay', 'planDay.weeklyPlan'],
        where: { planDay: { weeklyPlan: { user: { id: userId } as any, status: 'active' } as any } as any },
      });
      targetPlanId = plan?.planDay.weeklyPlan.id;
    }
    if (!targetPlanId) return [];
    return this.getForPlan(targetPlanId);
  }
}
