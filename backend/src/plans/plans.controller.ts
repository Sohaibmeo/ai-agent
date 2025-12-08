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
  list(@Req() req: any) {
    const userId = req.user?.userId as string;
    return this.plansService.findAll(userId);
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
  setMealRecipe(@Req() req: any, @Body() body: SetMealRecipeDto) {
    const userId = req.user?.userId as string;
    return this.plansService.setMealRecipe(body.planMealId, body.newRecipeId, userId);
  }

  @Post('activate')
  activate(@Req() req: any, @Body() body: ActivatePlanDto) {
    const userId = req.user?.userId as string;
    return this.plansService.setStatus(body.planId, 'active', userId);
  }

  @Post('status')
  setStatus(@Req() req: any, @Body() body: SetPlanStatusDto) {
    const userId = req.user?.userId as string;
    return this.plansService.setStatus(body.planId, body.status, userId);
  }

  @Post('save-custom-recipe')
  saveCustomRecipe(@Req() req: any, @Body() body: SaveCustomRecipeDto) {
    const userId = req.user?.userId as string;
    return this.plansService.saveCustomRecipe(userId, body.planMealId, body.newName, body.ingredientItems, body.instructions);
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
  getById(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.userId as string;
    return this.plansService.findById(id, userId);
  }
}
