import { IsString, IsUUID } from 'class-validator';

export class ActivatePlanDto {
  @IsUUID()
  planId!: string;
}
