import { Body, Controller, Get, Post, BadRequestException, Req, UseGuards } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get('health')
  list() {
    return "OK";
  }

  @Post('explain')
  async explain(@Req() req: any, @Body() body: { message?: string; context?: string }) {
    if (!body?.message) {
      throw new BadRequestException('message is required');
    }
    const userId = req.user?.userId as string;
    return this.agentsService.explain(body.message, body.context, userId);
  }
}
