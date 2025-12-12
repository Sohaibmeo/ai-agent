import { Body, Controller, Get, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  private readonly logger = new Logger(AuthController.name);

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

  @Post('access-request')
  async requestAccess(@Body() body: { email: string }) {
    try {
      const { flow } = await this.auth.requestAccessLink(body.email);
      return { status: 'ok', flow };
    } catch (err) {
      this.logger.warn(`Access request failed: ${err}`);
      return { status: 'error' };
    }
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @Post('set-password')
  async setPassword(@Body() body: { token: string; password: string }) {
    return this.auth.setPasswordFromToken(body.token, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('password')
  async changePassword(@Req() req: any, @Body() body: { password: string }) {
    return this.auth.changePassword(req.user.userId, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.auth.me(req.user.userId);
  }
}
