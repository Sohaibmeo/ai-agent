import { Body, Controller, Get, Post, Query, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { CustomFromExistingDto } from './dto/custom-from-existing.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RecipeCandidatesQueryDto } from './dto/recipe-candidates-query.dto';
import { GenerateRecipeDto } from './dto/generate-recipe.dto';

@Controller('recipes')
@UseGuards(JwtAuthGuard)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  list(@Req() req: any, @Query('search') search?: string, @Query('mine') mine?: string) {
    const userId = req.user?.userId as string;
    const mineOnly = String(mine || '').toLowerCase() === 'true';
    return this.recipesService.listForUser(userId, { search, mine: mineOnly });
  }

  @Get('candidates')
  async candidates(@Req() req: any, @Query() query: RecipeCandidatesQueryDto) {
    const userId = req.user?.userId as string;
    return this.recipesService.listCandidates(userId, {
      mealSlot: query.mealSlot,
      search: query.search,
      maxDifficulty: query.maxDifficulty,
      mealType: query.mealType,
      weeklyBudgetGbp: query.weeklyBudgetGbp,
      mealsPerDay: query.mealsPerDay,
      estimatedDayCost: query.estimatedDayCost,
      includeNonSearchable: query.includeNonSearchable,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.recipesService.findOneDetailed(id);
  }

  @Post('custom-from-existing')
  async customFromExisting(@Req() req: any, @Body() body: CustomFromExistingDto) {
    const userId = req.user?.userId as string;
    return this.recipesService.createCustomFromExisting({ ...body, createdByUserId: userId });
  }

  @Post()
  async createRecipe(@Req() req: any, @Body() body: CreateRecipeDto) {
    const userId = req.user?.userId as string;
    return this.recipesService.createUserRecipe(userId, body);
  }

  @Patch(':id')
  async updateRecipe(@Req() req: any, @Param('id') id: string, @Body() body: UpdateRecipeDto) {
    const userId = req.user?.userId as string;
    return this.recipesService.updateUserRecipe(id, userId, body);
  }

  @Post(':id/ai-adjust')
  async aiAdjustRecipe(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    const userId = req.user?.userId as string;
    return this.recipesService.adjustRecipeWithAi(id, userId, body.note);
  }

  @Post('ai-generate')
  async aiGenerateRecipe(@Req() req: any, @Body() body: GenerateRecipeDto) {
    const userId = req.user?.userId as string;
    return this.recipesService.generateRecipeWithAi({ ...body, userId });
  }

  @Post('ai-generate-from-image')
  async aiGenerateFromImage(
    @Req() req: any,
    @Body() body: { imageBase64: string; note?: string; mealSlot?: string; mealType?: string },
  ) {
    const userId = req.user?.userId as string;
    return this.recipesService.generateRecipeFromImage({ ...body, userId });
  }
}
