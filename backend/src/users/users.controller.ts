import { Body, Controller, Get, Param, Put, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id/profile')
  getProfile(@Req() req: any, @Param('id') userId: string) {
    const authId = req.user?.userId as string;
    if (authId !== userId) throw new ForbiddenException('Cannot access other user profiles');
    return this.usersService.getProfile(authId);
  }

  @Put(':id/profile')
  upsertProfile(@Req() req: any, @Param('id') userId: string, @Body() dto: UpdateProfileDto) {
    const authId = req.user?.userId as string;
    if (authId !== userId) throw new ForbiddenException('Cannot modify other user profiles');
    return this.usersService.upsertProfile(authId, dto);
  }
}
