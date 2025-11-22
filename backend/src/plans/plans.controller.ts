import { Body, Controller, Get, Post } from '@nestjs/common';
import { PlansService } from './plans.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { SetMealRecipeDto } from './dto/set-meal-recipe.dto';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  list() {
    return this.plansService.findAll();
  }

  @Post('generate')
  generate(@Body() body: GeneratePlanDto) {
    const weekStartDate = body.weekStartDate || new Date().toISOString().slice(0, 10);
    return this.plansService.generateWeek(body.userId, weekStartDate);
  }

  @Post('set-meal-recipe')
  setMealRecipe(@Body() body: SetMealRecipeDto) {
    return this.plansService.setMealRecipe(body.planMealId, body.newRecipeId);
  }
}
