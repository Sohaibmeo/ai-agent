import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GeneratePlanDto {
  @IsOptional()
  @IsString()
  weekStartDate?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  useAgent?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  useLlmRecipes?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  sameMealsAllWeek?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weeklyBudgetGbp?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  breakfast_enabled?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  snack_enabled?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  lunch_enabled?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  dinner_enabled?: boolean;

  @IsOptional()
  @IsString()
  maxDifficulty?: string;
}
