import { IsOptional, IsString } from 'class-validator';

export class GeneratePlanDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  weekStartDate?: string;
}
