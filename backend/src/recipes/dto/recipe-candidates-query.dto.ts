import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class RecipeCandidatesQueryDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  mealSlot?: string;

  @IsOptional()
  @IsString()
  maxDifficulty?: string;

  @IsOptional()
  @IsString()
  mealType?: 'solid' | 'drinkable';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weeklyBudgetGbp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mealsPerDay?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedDayCost?: number;

  @IsOptional()
  @Type(() => Boolean)
  includeNonSearchable?: boolean;
}
