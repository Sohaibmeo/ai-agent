import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPreferences, UserIngredientScore, UserRecipeScore } from '../database/entities';
import { PreferencesService } from './preferences.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserPreferences, UserIngredientScore, UserRecipeScore])],
  providers: [PreferencesService],
  exports: [PreferencesService],
})
export class PreferencesModule {}
