import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { WeeklyPlan, PlanDay, PlanMeal, PlanActionLog } from '../database/entities';
import { RecipesModule } from '../recipes/recipes.module';
import { UsersModule } from '../users/users.module';
import { ShoppingListModule } from '../shopping-list/shopping-list.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { AgentsModule } from '../agents/agents.module';
import { IngredientsModule } from '../ingredients/ingredients.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WeeklyPlan, PlanDay, PlanMeal, PlanActionLog]),
    forwardRef(() => RecipesModule),
    UsersModule,
    ShoppingListModule,
    forwardRef(() => PreferencesModule),
    forwardRef(() => AgentsModule),
    forwardRef(() => IngredientsModule),
  ],
  providers: [PlansService],
  controllers: [PlansController],
  exports: [PlansService],
})
export class PlansModule {}
