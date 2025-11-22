import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.findAll();
  }

  @Get(':id/profile')
  getProfile(@Param('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put(':id/profile')
  upsertProfile(@Param('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.upsertProfile(userId, dto);
  }
}
