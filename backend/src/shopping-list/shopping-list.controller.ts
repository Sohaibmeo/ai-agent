import { Controller, Get, Param } from '@nestjs/common';
import { ShoppingListService } from './shopping-list.service';

@Controller('shopping-list')
export class ShoppingListController {
  constructor(private readonly shoppingListService: ShoppingListService) {}

  @Get(':planId')
  get(@Param('planId') planId: string) {
    return this.shoppingListService.getForPlan(planId);
  }
}
