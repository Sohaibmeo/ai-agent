import { Controller, Get, Post } from '@nestjs/common';
import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  list() {
    return this.plansService.findAll();
  }

  @Post('generate')
  generate() {
    return this.plansService.generateDraft();
  }
}
