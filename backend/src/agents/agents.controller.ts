import { Body, Controller, Post } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CoachRequestDto } from './dto/coach.dto';
import { ExplanationRequestDto } from './dto/explanation.dto';
import { NutritionAdviceRequestDto } from './dto/nutrition-advice.dto';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('explain')
  explain(@Body() body: ExplanationRequestDto) {
    return this.agentsService.explain(body);
  }

  @Post('nutrition-advice')
  nutrition(@Body() body: NutritionAdviceRequestDto) {
    return this.agentsService.nutritionAdvice(body);
  }
}
