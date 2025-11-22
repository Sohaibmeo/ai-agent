import { IsOptional, IsString, IsUUID } from 'class-validator';

export class GeneratePlanDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  weekStartDate?: string;
}
