import { Type } from 'class-transformer';
import { IsArray, IsString, IsUUID, ValidateNested, IsNumber, IsOptional } from 'class-validator';

class IngredientChangeDto {
  @IsUUID()
  ingredientId!: string;

  @IsNumber()
  quantity!: number;

  @IsString()
  unit!: string;
}

export class SaveCustomRecipeDto {
  @IsUUID()
  planMealId!: string;

  @IsString()
  newName!: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientChangeDto)
  ingredientItems!: IngredientChangeDto[];
}
