import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { RecipeCandidatesQueryDto } from './dto/recipe-candidates-query.dto';
import { CustomFromExistingDto } from './dto/custom-from-existing.dto';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  list() {
    return this.recipesService.findAll();
  }

  @Get('candidates')
  candidates(@Query() query: RecipeCandidatesQueryDto) {
    return this.recipesService.findCandidatesForUser(query);
  }

  @Post('custom-from-existing')
  async customFromExisting(@Body() body: CustomFromExistingDto) {
    return this.recipesService.createCustomFromExisting(body);
  }
}
