import { Body, Controller, Get, Post, Query, Param, Patch } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { CustomFromExistingDto } from './dto/custom-from-existing.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  list(@Query('userId') userId?: string, @Query('search') search?: string) {
    return this.recipesService.listForUser(userId, search);
  }

  @Get('candidates')
  async candidates(@Query('userId') userId: string, @Query('mealSlot') mealSlot?: string, @Query('search') search?: string) {
    if (!userId) {
      throw new Error('userId is required');
    }
    return this.recipesService.listCandidates(userId, mealSlot, search);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.recipesService.findOneDetailed(id);
  }

  @Post('custom-from-existing')
  async customFromExisting(@Body() body: CustomFromExistingDto) {
    return this.recipesService.createCustomFromExisting(body);
  }

  @Post()
  async createRecipe(@Body() body: CreateRecipeDto, @Query('userId') userId?: string) {
    const uid = userId;
    return this.recipesService.createUserRecipe(uid, body);
  }

  @Patch(':id')
  async updateRecipe(@Param('id') id: string, @Body() body: UpdateRecipeDto, @Query('userId') userId?: string) {
    return this.recipesService.updateUserRecipe(id, userId, body);
  }

  @Post(':id/ai-adjust')
  async aiAdjustRecipe(
    @Param('id') id: string,
    @Body() body: { userId?: string; note?: string },
  ) {
    return this.recipesService.adjustRecipeWithAi(id, body.userId, body.note);
  }

  @Post('ai-generate')
  async aiGenerateRecipe(@Body() body: { userId?: string; note?: string; mealSlot?: string; mealType?: string }) {
    return this.recipesService.generateRecipeWithAi(body);
  }

  @Post('ai-generate-from-image')
  async aiGenerateFromImage(
    @Body() body: { userId?: string; imageBase64: string; note?: string; mealSlot?: string; mealType?: string },
  ) {
    return this.recipesService.generateRecipeFromImage(body);
  }
}
