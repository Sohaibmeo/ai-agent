import { IsString, IsUUID } from 'class-validator';

export class ActivatePlanDto {
  @IsUUID()
  planId!: string;
}

export class SetPlanStatusDto {
  @IsUUID()
  planId!: string;

  @IsString()
  status!: 'systemdraft' | 'draft' | 'active' | 'archived';
}
