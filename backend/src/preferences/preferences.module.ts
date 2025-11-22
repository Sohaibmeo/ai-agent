import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPreferences } from '../database/entities';
import { PreferencesService } from './preferences.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserPreferences])],
  providers: [PreferencesService],
  exports: [PreferencesService],
})
export class PreferencesModule {}
