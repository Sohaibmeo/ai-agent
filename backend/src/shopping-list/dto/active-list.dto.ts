import { IsOptional, IsString } from 'class-validator';

export class ActiveListDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  planId?: string;
}
