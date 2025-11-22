import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsNumber()
  height_cm?: number;

  @IsOptional()
  @IsNumber()
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
  @IsNumber()
  weekly_budget_gbp?: number;
}
