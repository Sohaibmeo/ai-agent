import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ShoppingListService } from './shopping-list.service';
import { ActiveListDto } from './dto/active-list.dto';
import { UserIdParamDto } from './dto/user-id-param.dto';
import { UpdatePantryDto } from './dto/update-pantry.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import { EmailListDto } from './dto/email-list.dto';

@Controller('shopping-list')
export class ShoppingListController {
  constructor(private readonly shoppingListService: ShoppingListService) {}

  @Get(':planId')
  get(@Param('planId') planId: string, @Query('userId') userId?: string) {
    return this.shoppingListService.getForPlan(planId, userId);
  }

  @Get('active/:userId')
  getActiveByUser(@Param() params: UserIdParamDto) {
    return this.shoppingListService.getActive(params.userId);
  }

  @Post('pantry')
  async updatePantry(@Body() body: UpdatePantryDto) {
    return this.shoppingListService.updatePantry(body.userId, body.ingredientId, body.hasItem, body.planId);
  }

  @Post('price')
  async updatePrice(@Body() body: UpdatePriceDto) {
    return this.shoppingListService.updatePrice(body.userId, body.ingredientId, body.pricePaid, body.quantity, body.unit, body.planId);
  }

  @Post('email')
  async emailList(@Body() body: EmailListDto) {
    return this.shoppingListService.emailList(body.planId);
  }
}
