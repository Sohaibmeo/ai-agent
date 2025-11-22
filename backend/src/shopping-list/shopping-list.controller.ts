import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ShoppingListService } from './shopping-list.service';
import { ActiveListDto } from './dto/active-list.dto';
import { UserIdParamDto } from './dto/user-id-param.dto';

@Controller('shopping-list')
export class ShoppingListController {
  constructor(private readonly shoppingListService: ShoppingListService) {}

  @Get(':planId')
  get(@Param('planId') planId: string) {
    return this.shoppingListService.getForPlan(planId);
  }

  @Get('active/:userId')
  getActiveByUser(@Param() params: UserIdParamDto) {
    return this.shoppingListService.getActive(params.userId);
  }
}
