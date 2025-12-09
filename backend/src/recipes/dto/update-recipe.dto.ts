import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRecipeIngredientDto {
  @IsOptional()
  @IsString()
  ingredientId?: string;

  @IsOptional()
  @IsString()
  ingredient_name?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

export class UpdateRecipeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  mealSlot?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRecipeIngredientDto)
  ingredients?: UpdateRecipeIngredientDto[];
}
