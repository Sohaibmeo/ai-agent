import { Body, Controller, Get, Post } from '@nestjs/common';
import { IngredientsService } from './ingredients.service';
import { ResolveIngredientDto } from './dto/resolve-ingredient.dto';

@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Get()
  list() {
    return this.ingredientsService.findAll();
  }

  @Post('resolve')
  async resolve(@Body() body: ResolveIngredientDto) {
    const limit = body.limit ?? 5;
    const minScore = body.minScore ?? 0.35;
    const exact = await this.ingredientsService.findByNameCaseInsensitive(body.query);
    if (exact) {
      return { matches: [{ ingredient: exact, score: 1.0 }], resolved: exact };
    }

    const fuzzy = await this.ingredientsService.searchFuzzy(body.query, limit);
    const aboveThreshold = fuzzy.filter((f) => f.score >= minScore);
    if (aboveThreshold.length === 1) {
      return { matches: fuzzy, resolved: aboveThreshold[0].ingredient };
    }
    if (aboveThreshold.length > 1) {
      return { matches: fuzzy, resolved: null };
    }

    if (body.createIfMissing) {
      const created = await this.ingredientsService.resolveOrCreateLoose(body.query);
      return { matches: [], resolved: created };
    }

    return { matches: fuzzy, resolved: null };
  }
}
