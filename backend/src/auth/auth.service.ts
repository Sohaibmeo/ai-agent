import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { User, UserProfile } from '../database/entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile) private readonly profileRepo: Repository<UserProfile>,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: User) {
    const token = this.jwt.sign({ sub: user.id, email: user.email });
    const profile = await this.profileRepo.findOne({ where: { user_id: user.id } });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        hasProfile: !!profile && (profile.age || profile.height_cm || profile.weight_kg),
      },
    };
  }

  async me(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const profile = await this.profileRepo.findOne({ where: { user_id: user.id } });
    return {
      id: user.id,
      email: user.email,
      hasProfile: !!profile && (profile.age || profile.height_cm || profile.weight_kg),
    };
  }
}
