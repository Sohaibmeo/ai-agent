import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ShoppingListService } from './shopping-list.service';
import { ActiveListDto } from './dto/active-list.dto';

@Controller('shopping-list')
export class ShoppingListController {
  constructor(private readonly shoppingListService: ShoppingListService) {}

  @Get(':planId')
  get(@Param('planId') planId: string) {
    return this.shoppingListService.getForPlan(planId);
  }

  @Post('active')
  getActive(@Body() body: ActiveListDto) {
    return this.shoppingListService.getActive(body.userId, body.planId);
  }
}
