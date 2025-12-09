import { IsOptional, IsString, IsUUID, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateRecipeDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  mealSlot?: string;

  @IsOptional()
  @IsString()
  mealType?: 'solid' | 'drinkable';

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetPerMeal?: number;
}
