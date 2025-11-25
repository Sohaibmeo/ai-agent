import { Body, Controller, Post } from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { AvoidIngredientDto } from './dto/avoid-ingredient.dto';

@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Post('avoid-ingredient')
  async avoidIngredient(@Body() body: AvoidIngredientDto) {
    await this.preferencesService.setAvoidIngredient(body.userId, body.ingredientId);
    return { ok: true };
  }
}
