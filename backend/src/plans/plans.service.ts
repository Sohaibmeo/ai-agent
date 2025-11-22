import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyPlan } from '../database/entities';
import { RecipesService } from '../recipes/recipes.service';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(WeeklyPlan)
    private readonly weeklyPlanRepo: Repository<WeeklyPlan>,
    private readonly recipesService: RecipesService,
  ) {}

  findAll() {
    return this.weeklyPlanRepo.find({ relations: ['days', 'days.meals'] });
  }

  generateDraft() {
    return { id: 'draft_plan_id', status: 'draft' };
  }
}
