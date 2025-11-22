import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { WeeklyPlan, PlanDay, PlanMeal, Recipe } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([WeeklyPlan, PlanDay, PlanMeal, Recipe])],
  providers: [PlansService],
  controllers: [PlansController],
  exports: [PlansService],
})
export class PlansModule {}
