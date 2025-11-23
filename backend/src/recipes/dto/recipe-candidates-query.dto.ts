import { IsOptional, IsString } from 'class-validator';

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
}
