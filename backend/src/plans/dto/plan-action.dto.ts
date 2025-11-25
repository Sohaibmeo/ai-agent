import { IsNotEmpty, IsOptional, IsString, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

class ActionContextDto {
  @IsString()
  type!: string;

  @IsOptional()
  @IsUUID()
  planDayId?: string;

  @IsOptional()
  @IsUUID()
  planMealId?: string;

  @IsOptional()
  @IsUUID()
  ingredientId?: string;

  @IsOptional()
  @IsString()
  ingredientName?: string;
}

export class PlanActionDto {
  @ValidateNested()
  @Type(() => ActionContextDto)
  actionContext!: ActionContextDto;

  @IsOptional()
  @IsString()
  reasonText?: string;

  // Optional userId in case plan lookup lacks relation; falls back to plan.user
  @IsOptional()
  @IsUUID()
  userId?: string;
}
