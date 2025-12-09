import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRecipeIngredientDto {
  @IsOptional()
  @IsString()
  ingredientId?: string;

  @IsOptional()
  @IsString()
  ingredient_name?: string;

  @IsNumber()
  quantity!: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

export class CreateRecipeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  mealSlot?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  ingredients: CreateRecipeIngredientDto[] = [];

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
