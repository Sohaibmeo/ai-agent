import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    try {
      await this.auth.resetPassword(body.email);
      return { status: 'ok' };
    } catch (err) {
      // ensure we do not leak SMTP details
      return { status: 'error' };
    }
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.auth.me(req.user.userId);
  }
}
