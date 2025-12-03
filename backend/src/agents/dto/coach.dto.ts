import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CoachRequestDto {
  @IsOptional()
  profile?: unknown;

  @IsOptional()
  @IsString()
  week_start_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weekly_budget_gbp?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  sameMealsAllWeek?: boolean;
}
