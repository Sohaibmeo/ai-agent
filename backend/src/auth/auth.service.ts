import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { User, UserProfile } from '../database/entities';
import * as nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile) private readonly profileRepo: Repository<UserProfile>,
    private readonly jwt: JwtService,
  ) {}
  private readonly logger = new Logger(AuthService.name);

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.buildAuthResponse(user);
  }

  async resetPassword(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      this.logger.warn(`Password reset requested for unknown email=${email}`);
      return;
    }

    this.logger.log(`Sending temporary password to ${email}`);

    const tempPassword = randomBytes(8).toString('base64url');
    user.password_hash = await bcrypt.hash(tempPassword, 10);
    await this.userRepo.save(user);

    const transport = await this.buildEmailTransport();
    const from = process.env.SMTP_FROM || 'OverCooked <no-reply@overcooked.ai>';
    await transport.sendMail({
      from,
      to: email,
      subject: 'OverCooked password reset',
      text: `Your temporary password is: ${tempPassword}\n\nUse it to log in and update your password immediately.`,
    });
  }

  private async buildEmailTransport() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
      throw new Error('SMTP not configured');
    }
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
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
