import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class GeneratePlanDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  weekStartDate?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  useAgent?: boolean;
}
