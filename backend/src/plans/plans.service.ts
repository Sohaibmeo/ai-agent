import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyPlan } from '../database/entities';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(WeeklyPlan)
    private readonly weeklyPlanRepo: Repository<WeeklyPlan>,
  ) {}

  findAll() {
    return this.weeklyPlanRepo.find({ relations: ['days', 'days.meals'] });
  }

  generateDraft() {
    return { id: 'draft_plan_id', status: 'draft' };
  }
}
