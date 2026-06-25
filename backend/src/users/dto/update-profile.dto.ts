import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(13)
  @Max(100)
  age?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(120)
  @Max(230)
  height_cm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(35)
  @Max(300)
  weight_kg?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  activity_level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  goal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  goal_intensity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  diet_type?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergy_keys?: string[];

  @IsOptional()
  @IsBoolean()
  breakfast_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  snack_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  lunch_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  dinner_enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  max_difficulty?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(500)
  weekly_budget_gbp?: number;
}
