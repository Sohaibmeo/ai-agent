import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from '../database/entities';
import { ProfileController } from './profile.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserProfile]), AuthModule],
  controllers: [ProfileController],
})
export class ProfileModule {}
