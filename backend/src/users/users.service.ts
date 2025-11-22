import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserProfile } from '../database/entities';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile) private readonly profileRepo: Repository<UserProfile>,
  ) {}

  findAll() {
    return this.userRepo.find();
  }

  async getProfile(userId: string) {
    const profile = await this.profileRepo.findOne({
      where: { user_id: userId },
    });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }

  async upsertProfile(userId: string, dto: UpdateProfileDto) {
    let user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      user = this.userRepo.create({ id: userId });
      await this.userRepo.save(user);
    }
    let profile = await this.profileRepo.findOne({ where: { user_id: userId } });
    if (!profile) {
      profile = this.profileRepo.create({ user_id: userId, ...dto });
    } else {
      Object.assign(profile, dto);
    }
    const saved = await this.profileRepo.save(profile);
    return saved;
  }
}
