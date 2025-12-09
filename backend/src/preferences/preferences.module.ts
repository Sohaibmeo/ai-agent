import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPreferences, UserIngredientScore, UserRecipeScore } from '../database/entities';
import { PreferencesService } from './preferences.service';
import { PreferencesController } from './preferences.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserPreferences, UserIngredientScore, UserRecipeScore])],
  providers: [PreferencesService],
  controllers: [PreferencesController],
  exports: [PreferencesService],
})
export class PreferencesModule {}
