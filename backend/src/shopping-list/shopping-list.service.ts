import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShoppingListItem } from '../database/entities';
import { PlansService } from '../plans/plans.service';
import { IngredientsService } from '../ingredients/ingredients.service';

@Injectable()
export class ShoppingListService {
  constructor(
    @InjectRepository(ShoppingListItem)
    private readonly shoppingListRepo: Repository<ShoppingListItem>,
    private readonly plansService: PlansService,
    private readonly ingredientsService: IngredientsService,
  ) {}

  getForPlan(planId: string) {
    return this.shoppingListRepo.find({
      where: { weeklyPlan: { id: planId } },
    });
  }

  async rebuildForPlan(planId: string) {
    // Simplified: clear and rebuild by aggregating recipe ingredients scaled by portion.
    await this.shoppingListRepo.delete({ weeklyPlan: { id: planId } as any });

    // TODO: implement aggregation based on plan meals and recipe ingredients.
    return [];
  }
}
