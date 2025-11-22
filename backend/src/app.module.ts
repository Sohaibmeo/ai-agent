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
import * as entities from './database/entities';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'ai_user',
      password: process.env.DB_PASSWORD || 'ai_password',
      database: process.env.DB_NAME || 'ai_agent',
      entities: Object.values(entities),
      synchronize: true,
      logging: false,
    }),
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
