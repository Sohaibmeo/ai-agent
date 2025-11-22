import { Body, Controller, Post } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { ReviewRequestDto } from './dto/review.dto';
import { CoachRequestDto } from './dto/coach.dto';
import { ExplanationRequestDto } from './dto/explanation.dto';
import { NutritionAdviceRequestDto } from './dto/nutrition-advice.dto';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('review')
  review(@Body() body: ReviewRequestDto) {
    return this.agentsService.reviewAction(body);
  }

  @Post('coach')
  coach(@Body() body: CoachRequestDto) {
    return this.agentsService.coachPlan({
      profile: body.profile,
      candidates: body.candidates,
      week_start_date: body.week_start_date,
    });
  }

  @Post('explain')
  explain(@Body() body: ExplanationRequestDto) {
    return this.agentsService.explain(body);
  }

  @Post('nutrition-advice')
  nutrition(@Body() body: NutritionAdviceRequestDto) {
    return this.agentsService.nutritionAdvice(body);
  }
}
