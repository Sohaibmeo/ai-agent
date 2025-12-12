import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../database/entities';

@Injectable()
export class CreditService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
  ) {}

  private async loadProfile(userId: string) {
    let profile = await this.profileRepo.findOne({ where: { user_id: userId } });
    if (!profile) {
      profile = this.profileRepo.create({ user_id: userId, allergy_keys: [], credit: 35 });
      profile = await this.profileRepo.save(profile);
    }
    return profile;
  }

  async charge(userId: string, amount: number) {
    if (amount <= 0) return;
    const profile = await this.loadProfile(userId);
    const current = Number(profile.credit ?? 0);
    if (current < amount - 1e-8) {
      throw new BadRequestException('Not enough credits');
    }
    profile.credit = Number((current - amount).toFixed(4));
    await this.profileRepo.save(profile);
  }
}
