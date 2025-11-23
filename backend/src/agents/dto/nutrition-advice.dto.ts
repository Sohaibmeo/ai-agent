import { IsArray, IsOptional, IsString } from 'class-validator';

export class NutritionAdviceRequestDto {
  @IsOptional()
  profile?: unknown;

  @IsOptional()
  currentPlan?: unknown;

  @IsOptional()
  concerns?: string[];
}

export class NutritionAdviceItem {
  @IsString()
  title!: string;

  @IsString()
  detail!: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class NutritionAdviceResponseDto {
  @IsArray()
  advice!: NutritionAdviceItem[];
}
