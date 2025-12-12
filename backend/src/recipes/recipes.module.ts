import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { Recipe, RecipeIngredient, Ingredient, UserRecipeScore } from '../database/entities';
import { UsersModule } from '../users/users.module';
import { IngredientsModule } from '../ingredients/ingredients.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { AgentsModule } from '../agents/agents.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recipe, RecipeIngredient, Ingredient]),
    TypeOrmModule.forFeature([UserRecipeScore]),
    UsersModule,
    forwardRef(() => IngredientsModule),
    forwardRef(() => PreferencesModule),
    forwardRef(() => AgentsModule),
    ProfileModule,
  ],
  providers: [RecipesService],
  controllers: [RecipesController],
  exports: [RecipesService],
})
export class RecipesModule {}
