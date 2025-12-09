import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ResolveIngredientDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsBoolean()
  createIfMissing?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minScore?: number;
}
