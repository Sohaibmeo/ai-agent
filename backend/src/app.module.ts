import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './common/health.module';
import { UsersModule } from './users/users.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { RecipesModule } from './recipes/recipes.module';
import { PlansModule } from './plans/plans.module';
import { ShoppingListModule } from './shopping-list/shopping-list.module';
import { AgentsModule } from './agents/agents.module';

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    UsersModule,
    IngredientsModule,
    RecipesModule,
    PlansModule,
    ShoppingListModule,
    AgentsModule,
  ],
})
export class AppModule {}
