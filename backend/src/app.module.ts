import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './common/health.module';
import { UsersModule } from './users/users.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { RecipesModule } from './recipes/recipes.module';
import { PlansModule } from './plans/plans.module';
import { ShoppingListModule } from './shopping-list/shopping-list.module';
import { AgentsModule } from './agents/agents.module';
import { PreferencesModule } from './preferences/preferences.module';
import { AppDataSource } from '../ormconfig';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { WorkflowRuntimeController } from './workflows/workflow-runtime.controller';
import { WorkflowRuntimeService } from './workflows/workflow-runtime.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRoot(AppDataSource.options),
    HealthModule,
    UsersModule,
    IngredientsModule,
    RecipesModule,
    PlansModule,
    ShoppingListModule,
    AgentsModule,
    PreferencesModule,
    AuthModule,
    ProfileModule,
  ],
  controllers: [WorkflowRuntimeController],
  providers: [WorkflowRuntimeService],
})
export class AppModule {}
