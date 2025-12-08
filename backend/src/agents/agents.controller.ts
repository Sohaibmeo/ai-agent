import { Body, Controller, Get, Post, BadRequestException } from '@nestjs/common';
import { AgentsService } from './agents.service';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get('health')
  list() {
    return "OK";
  }

  @Post('explain')
  async explain(@Body() body: { message?: string; context?: string }) {
    if (!body?.message) {
      throw new BadRequestException('message is required');
    }
    return this.agentsService.explain(body.message, body.context);
  }
}
