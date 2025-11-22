import { Body, Controller, Get, Post } from '@nestjs/common';
import { PlansService } from './plans.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';

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
}
