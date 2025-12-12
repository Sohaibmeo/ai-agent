import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { User, UserProfile } from '../database/entities';
import * as nodemailer from 'nodemailer';
type AccessLinkFlow = 'access' | 'reset';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile) private readonly profileRepo: Repository<UserProfile>,
    private readonly jwt: JwtService,
  ) {}
  private readonly logger = new Logger(AuthService.name);
  private readonly frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
  private readonly accessTokenExpiry = '1h';

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
    const normalized = email?.trim().toLowerCase();
    if (!normalized) {
      return;
    }
    const user = await this.userRepo.findOne({ where: { email: normalized } });
    if (!user) {
      this.logger.warn(`Password reset requested for unknown email=${normalized}`);
      return;
    }
    this.logger.log(`Sending set-password link to ${normalized}`);
    await this.sendSetPasswordEmail(user, normalized, 'reset');
  }

  async requestAccessLink(email: string): Promise<{ flow: AccessLinkFlow }> {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    const normalized = email.trim().toLowerCase();
    let user = await this.userRepo.findOne({ where: { email: normalized } });
    let flow: AccessLinkFlow = 'access';
    if (!user) {
      user = this.userRepo.create({ email: normalized });
      user = await this.userRepo.save(user);
    } else {
      flow = user.password_hash ? 'reset' : 'access';
      if (!user.email) {
        user.email = normalized;
        user = await this.userRepo.save(user);
      }
    }

    await this.sendSetPasswordEmail(user, normalized, flow);

    return { flow };
  }

  async setPasswordFromToken(token: string, password: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    if (!password || password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch (err) {
      this.logger.warn(`Invalid access token: ${err}`);
      throw new UnauthorizedException('Invalid or expired link');
    }
    if (payload.action !== 'set_password' || !payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    user.password_hash = await bcrypt.hash(password, 10);
    await this.userRepo.save(user);

    return this.buildAuthResponse(user);
  }

  async changePassword(userId: string, password: string) {
    if (!password || password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    user.password_hash = await bcrypt.hash(password, 10);
    await this.userRepo.save(user);

    return { status: 'ok' };
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

  private createSetPasswordToken(user: User) {
    return this.jwt.sign(
      { sub: user.id, email: user.email, action: 'set_password' },
      { expiresIn: this.accessTokenExpiry },
    );
  }

  private async sendSetPasswordEmail(user: User, email: string, flow: AccessLinkFlow) {
    const token = this.createSetPasswordToken(user);
    const link = `${this.frontendBaseUrl}/auth/set-password?token=${encodeURIComponent(token)}`;
    const transport = await this.buildEmailTransport();
    const subject = flow === 'access' ? 'OverCooked access link' : 'OverCooked password reset';
    const body =
      flow === 'access'
        ? `Click this link to set your password and sign in: ${link}\n\nIt expires in one hour.`
        : `Click this link to reset your password: ${link}\n\nIt expires in one hour.`;
    await transport.sendMail({
      from: process.env.SMTP_FROM || 'OverCooked <no-reply@overcooked.ai>',
      to: email,
      subject,
      text: body,
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
