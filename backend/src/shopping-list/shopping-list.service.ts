import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Ingredient,
  PlanMeal,
  RecipeIngredient,
  ShoppingListItem,
  PantryItem,
  UserIngredientPrice,
  WeeklyPlan,
} from '../database/entities';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class ShoppingListService {
  private readonly logger = new Logger(ShoppingListService.name);

  constructor(
    @InjectRepository(ShoppingListItem)
    private readonly shoppingListRepo: Repository<ShoppingListItem>,
    @InjectRepository(PantryItem)
    private readonly pantryRepo: Repository<PantryItem>,
    @InjectRepository(UserIngredientPrice)
    private readonly priceRepo: Repository<UserIngredientPrice>,
    @InjectRepository(WeeklyPlan)
    private readonly weeklyPlanRepo: Repository<WeeklyPlan>,
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  async getForPlan(planId: string, userId?: string) {
    const baseItems = await this.shoppingListRepo.find({
      where: { weeklyPlan: { id: planId } },
      relations: ['ingredient'],
    });
    if (!userId) {
      return {
        weekly_plan_id: planId,
        items: baseItems,
      };
    }

    // Apply pantry flags and user price overrides on the fly for response
    const [overrides, pantry] = await Promise.all([
      this.priceRepo.find({ where: { user: { id: userId } as any }, relations: ['ingredient'] }),
      this.pantryRepo.find({ where: { user: { id: userId } as any }, relations: ['ingredient'] }),
    ]);
    const overrideMap = new Map(overrides.map((o) => [o.ingredient.id, Number(o.price_per_unit_gbp)]));
    const pantryMap = new Map(pantry.map((p) => [p.ingredient.id, p.has_item]));

    const items = baseItems.map((item) => {
      const pricePerUnit = overrideMap.get(item.ingredient.id);
      const hasItem = pantryMap.get(item.ingredient.id) ?? false;
      const estimated = pricePerUnit ? pricePerUnit * Number(item.total_quantity) : item.estimated_cost_gbp;
      return {
        ...item,
        estimated_cost_gbp: estimated,
        has_item: hasItem,
      };
    });

    return {
      weekly_plan_id: planId,
      items,
    };
  }

  async rebuildForPlan(planId: string) {
    const plan = await this.weeklyPlanRepo.findOne({ where: { id: planId }, relations: ['user'] });
    if (!plan) throw new Error('Plan not found');
    const userId = plan.user?.id;
    if (!userId) throw new Error('Plan user missing');
    this.logger.log(`rebuild shopping list plan=${planId} user=${userId}`);

    // Clear existing
    await this.shoppingListRepo.delete({ weeklyPlan: { id: planId } as any });

    // Aggregate ingredients across plan meals
    const meals = await this.entityManager.find(PlanMeal, {
      where: { planDay: { weeklyPlan: { id: planId } } as any },
      relations: ['recipe'],
    });
    if (!meals.length) return [];

    // Load recipe ingredients for all recipes in plan
    const recipeIds = meals.map((m) => m.recipe?.id).filter(Boolean);
    const recipeIngredients = await this.entityManager
      .getRepository(RecipeIngredient)
      .createQueryBuilder('ri')
      .innerJoinAndSelect('ri.ingredient', 'ingredient')
      .innerJoinAndSelect('ri.recipe', 'recipe')
      .where('ri.recipe_id IN (:...recipeIds)', { recipeIds })
      .getMany();

    const totals = new Map<
      string,
      { ingredient: Ingredient; quantity: number; unit: string; costPerUnit?: number }
    >();

    for (const meal of meals) {
      if (!meal.recipe?.id) continue;
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
    this.logger.log(`shopping list rebuilt plan=${planId} items=${toSave.length}`);
    return this.getForPlan(planId, userId);
  }

  async getActive(userId: string, planId?: string) {
    let targetPlanId = planId;
    if (!targetPlanId) {
      const plan = await this.weeklyPlanRepo.findOne({
        where: { user: { id: userId } as any, status: 'active' },
      });
      targetPlanId = plan?.id;
    }
    if (!targetPlanId) {
      throw new Error('No active plan for this user');
    }
    this.logger.log(`get active shopping list plan=${targetPlanId} user=${userId}`);
    return this.getForPlan(targetPlanId, userId);
  }

  async updatePantry(userId: string, ingredientId: string, hasItem: boolean, planId?: string) {
    const existing = await this.pantryRepo.findOne({
      where: { user: { id: userId } as any, ingredient: { id: ingredientId } as any },
    });
    if (existing) {
      existing.has_item = hasItem;
      await this.pantryRepo.save(existing);
    } else {
      await this.pantryRepo.save({
        user: { id: userId } as any,
        ingredient: { id: ingredientId } as any,
        has_item: hasItem,
      });
    }
    const targetPlanId = planId || (await this.weeklyPlanRepo.findOne({ where: { user: { id: userId } as any, status: 'active' } }))?.id;
    if (targetPlanId) {
      return this.getForPlan(targetPlanId, userId);
    }
    return this.getActive(userId);
  }

  async updatePrice(
    userId: string,
    ingredientId: string,
    pricePaid: number,
    quantity: number,
    unit: string,
    planId?: string,
  ) {
    const perUnit = quantity > 0 ? pricePaid / quantity : null;
    if (!perUnit) {
      throw new Error('quantity must be greater than zero');
    }
    const existing = await this.priceRepo.findOne({
      where: { user: { id: userId } as any, ingredient: { id: ingredientId } as any },
    });
    if (existing) {
      existing.price_per_unit_gbp = perUnit;
      await this.priceRepo.save(existing);
    } else {
      await this.priceRepo.save({
        user: { id: userId } as any,
        ingredient: { id: ingredientId } as any,
        price_per_unit_gbp: perUnit,
      });
    }
    let targetPlanId = planId;
    if (!targetPlanId) {
      const plan = await this.weeklyPlanRepo.findOne({ where: { user: { id: userId } as any, status: 'active' } });
      targetPlanId = plan?.id;
    }
    if (targetPlanId) {
      await this.rebuildForPlan(targetPlanId);
      return this.getForPlan(targetPlanId, userId);
    }
    return this.getActive(userId);
  }
}
