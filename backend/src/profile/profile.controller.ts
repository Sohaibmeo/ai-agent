import { Body, Controller, Get, Put, UseGuards, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { UserProfile } from '../database/entities';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
  ) {}

  @Get('me')
  async getMe(@Req() req: any) {
    const userId = req.user.userId;
    let profile = await this.profileRepo.findOne({ where: { user_id: userId } });
    if (!profile) {
      profile = this.profileRepo.create({ user_id: userId, allergy_keys: [] });
      profile = await this.profileRepo.save(profile);
    }
    return profile;
  }

  @Put('me')
  async updateMe(@Req() req: any, @Body() body: Partial<UserProfile>) {
    const userId = req.user.userId;
    let profile = await this.profileRepo.findOne({ where: { user_id: userId } });
    if (!profile) {
      profile = this.profileRepo.create({ user_id: userId, allergy_keys: [] });
    }

    // Coerce numeric fields to numbers to match the DB schema
    const age = body.age != null ? Math.round(Number(body.age)) : undefined;
    const height = body.height_cm != null ? Number(body.height_cm) : undefined;
    const weight = body.weight_kg != null ? Number(body.weight_kg) : undefined;

    profile.age = Number.isFinite(age) ? age : profile.age;
    profile.height_cm = Number.isFinite(height) ? height : profile.height_cm;
    profile.weight_kg = Number.isFinite(weight) ? weight : profile.weight_kg;
    profile.activity_level = body.activity_level ?? profile.activity_level;
    profile.goal = body.goal ?? profile.goal;
    profile.goal_intensity = body.goal_intensity ?? profile.goal_intensity;
    profile.diet_type = body.diet_type ?? profile.diet_type;
    profile.allergy_keys = body.allergy_keys ?? profile.allergy_keys ?? [];
    profile.breakfast_enabled = body.breakfast_enabled ?? profile.breakfast_enabled ?? true;
    profile.snack_enabled = body.snack_enabled ?? profile.snack_enabled ?? true;
    profile.lunch_enabled = body.lunch_enabled ?? profile.lunch_enabled ?? true;
    profile.dinner_enabled = body.dinner_enabled ?? profile.dinner_enabled ?? true;
    profile.max_difficulty = body.max_difficulty ?? profile.max_difficulty ?? 'easy';
    profile.weekly_budget_gbp = body.weekly_budget_gbp ?? profile.weekly_budget_gbp;

    return this.profileRepo.save(profile);
  }
}
