import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ActiveListDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsUUID()
  planId?: string;
}
