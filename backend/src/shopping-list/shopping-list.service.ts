import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ingredient, PlanMeal, RecipeIngredient, ShoppingListItem } from '../database/entities';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class ShoppingListService {
  constructor(
    @InjectRepository(ShoppingListItem)
    private readonly shoppingListRepo: Repository<ShoppingListItem>,
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

    const totals = new Map<string, { ingredient: Ingredient; quantity: number; unit: string }>();

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
          totals.set(key, { ingredient: ri.ingredient, quantity, unit: ri.unit });
        }
      }
    }

    const toSave: Partial<ShoppingListItem>[] = [];
    for (const [, val] of totals) {
      const estimatedCost = val.ingredient.estimated_price_per_unit_gbp
        ? Number(val.ingredient.estimated_price_per_unit_gbp) * val.quantity
        : undefined;
      toSave.push({
        weeklyPlan: { id: planId } as any,
        ingredient: val.ingredient,
        total_quantity: val.quantity,
        unit: val.unit,
        estimated_cost_gbp: estimatedCost,
      });
    }

    await this.shoppingListRepo.save(toSave);
    return this.getForPlan(planId);
  }
}
