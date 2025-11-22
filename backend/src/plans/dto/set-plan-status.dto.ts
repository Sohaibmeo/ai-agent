import { IsString } from 'class-validator';

export class ActivatePlanDto {
  @IsString()
  planId!: string;
}
