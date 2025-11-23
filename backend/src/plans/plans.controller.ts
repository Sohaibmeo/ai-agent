import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PlansService } from './plans.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { SetMealRecipeDto } from './dto/set-meal-recipe.dto';
import { ActivatePlanDto } from './dto/set-plan-status.dto';
import { UserIdParamDto } from './dto/user-id-param.dto';
import { PlanActionDto } from './dto/plan-action.dto';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  list() {
    return this.plansService.findAll();
  }

  @Get('active/:userId')
  getActive(@Param() params: UserIdParamDto) {
    return this.plansService.getActivePlan(params.userId);
  }

  @Post('generate')
  generate(@Body() body: GeneratePlanDto) {
    const weekStartDate = body.weekStartDate || new Date().toISOString().slice(0, 10);
    return this.plansService.generateWeek(body.userId, weekStartDate, body.useAgent);
  }

  @Post('set-meal-recipe')
  setMealRecipe(@Body() body: SetMealRecipeDto) {
    return this.plansService.setMealRecipe(body.planMealId, body.newRecipeId);
  }

  @Post('activate')
  activate(@Body() body: ActivatePlanDto) {
    return this.plansService.setStatus(body.planId, 'active');
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.plansService.findById(id);
  }

  @Post(':weeklyPlanId/actions')
  applyAction(@Param('weeklyPlanId') weeklyPlanId: string, @Body() body: PlanActionDto) {
    return this.plansService.applyAction(weeklyPlanId, {
      actionContext: body.actionContext,
      reasonText: body.reasonText,
      userId: body.userId,
    });
  }
}
