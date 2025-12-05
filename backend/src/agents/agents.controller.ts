import { Body, Controller, Post } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { ReviewRequestDto } from './dto/review.dto';
import { CoachRequestDto } from './dto/coach.dto';
import { ExplanationRequestDto } from './dto/explanation.dto';
import { NutritionAdviceRequestDto } from './dto/nutrition-advice.dto';
import { PlansService } from '../plans/plans.service';
import { ChooseIngredientDto } from './dto/choose-ingredient.dto';

@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly plansService: PlansService,
  ) {}

  @Post('review')
  review(@Body() body: ReviewRequestDto) {
    return this.agentsService.reviewAction(body);
  }

  @Post('review-and-swap')
  async reviewAndSwap(@Body() body: { planMealId: string; text?: string; currentPlanSnippet?: unknown; candidates?: any[] }) {
    const review = await this.agentsService.reviewAction({ text: body.text, currentPlanSnippet: body.currentPlanSnippet });
    if ((review.action === 'swap_ingredient' || review.action === 'regenerate_meal') && body.planMealId && body.candidates?.length) {
      const chosen = body.candidates[0];
      if (chosen?.id) {
        await this.plansService.setMealRecipe(body.planMealId, chosen.id);
      }
    }
    return { review };
  }

  @Post('explain')
  explain(@Body() body: ExplanationRequestDto) {
    return this.agentsService.explain(body);
  }

  @Post('nutrition-advice')
  nutrition(@Body() body: NutritionAdviceRequestDto) {
    return this.agentsService.nutritionAdvice(body);
  }

  @Post('choose-ingredient')
  chooseIngredient(@Body() body: ChooseIngredientDto) {
    return this.agentsService.chooseIngredient(body);
  }
}
