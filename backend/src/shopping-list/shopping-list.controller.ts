import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ShoppingListService } from './shopping-list.service';
import { ActiveListDto } from './dto/active-list.dto';
import { UpdatePantryDto } from './dto/update-pantry.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import { EmailListDto } from './dto/email-list.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('shopping-list')
@UseGuards(JwtAuthGuard)
export class ShoppingListController {
  constructor(private readonly shoppingListService: ShoppingListService) {}

  @Get(':planId')
  get(@Req() req: any, @Param('planId') planId: string) {
    const userId = req.user?.userId as string;
    return this.shoppingListService.getForPlan(planId, userId);
  }

  @Get('active')
  getActiveByUser(@Req() req: any) {
    const userId = req.user?.userId as string;
    return this.shoppingListService.getActive(userId);
  }

  @Post('pantry')
  async updatePantry(@Req() req: any, @Body() body: UpdatePantryDto) {
    const userId = req.user?.userId as string;
    return this.shoppingListService.updatePantry(userId, body.ingredientId, body.hasItem, body.planId);
  }

  @Post('price')
  async updatePrice(@Req() req: any, @Body() body: UpdatePriceDto) {
    const userId = req.user?.userId as string;
    return this.shoppingListService.updatePrice(userId, body.ingredientId, body.pricePaid, body.quantity, body.unit, body.planId);
  }

  @Post('email')
  async emailList(@Body() body: EmailListDto) {
    return this.shoppingListService.emailList(body.planId);
  }
}
