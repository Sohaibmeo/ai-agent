import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { SetMealRecipeDto } from './dto/set-meal-recipe.dto';
import { ActivatePlanDto } from './dto/set-plan-status.dto';
import { SetPlanStatusDto } from './dto/set-plan-status.dto';
import { SaveCustomRecipeDto } from './dto/save-custom-recipe.dto';
import { AiPlanSwapDto } from './dto/ai-plan-swap.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  list() {
    return this.plansService.findAll();
  }

  @Get('active')
  getActive(@Req() req: any) {
    const userId = req.user?.userId as string;
    return this.plansService.getActivePlan(userId);
  }

  @Post('generate')
  generate(@Req() req: any, @Body() body: GeneratePlanDto) {
    const userId = req.user?.userId as string;
    const weekStartDate = body.weekStartDate || new Date().toISOString().slice(0, 10);
    return this.plansService.generateWeek(userId, weekStartDate, body.useAgent, {
      useLlmRecipes: body.useLlmRecipes,
      sameMealsAllWeek: body.sameMealsAllWeek,
      weeklyBudgetGbp: body.weeklyBudgetGbp,
      breakfast_enabled: body.breakfast_enabled,
      snack_enabled: body.snack_enabled,
      lunch_enabled: body.lunch_enabled,
      dinner_enabled: body.dinner_enabled,
      maxDifficulty: body.maxDifficulty,
    });
  }

  @Post('set-meal-recipe')
  setMealRecipe(@Body() body: SetMealRecipeDto) {
    return this.plansService.setMealRecipe(body.planMealId, body.newRecipeId);
  }

  @Post('activate')
  activate(@Body() body: ActivatePlanDto) {
    return this.plansService.setStatus(body.planId, 'active');
  }

  @Post('status')
  setStatus(@Body() body: SetPlanStatusDto) {
    return this.plansService.setStatus(body.planId, body.status);
  }

  @Post('save-custom-recipe')
  saveCustomRecipe(@Body() body: SaveCustomRecipeDto) {
    return this.plansService.saveCustomRecipe(body.planMealId, body.newName, body.ingredientItems, body.instructions);
  }

  @Post('ai-plan-swap')
  aiPlanSwap(@Req() req: any, @Body() body: AiPlanSwapDto) {
    // For debugging:
    // console.log('[ai-plan-swap] request', JSON.stringify(body));
    const userId = req.user?.userId as string;
    if (body?.weeklyPlanId && userId) {
      return this.plansService.reviewAndApplyFromAiSwap({ ...body, userId });
    }
    return { ok: true, received: body, warning: 'weeklyPlanId and userId are required' };
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.plansService.findById(id);
  }
}
