import { IsOptional, IsString } from 'class-validator';

export class CoachRequestDto {
  @IsOptional()
  profile?: unknown;

  @IsOptional()
  candidates?: unknown;

  @IsOptional()
  @IsString()
  week_start_date?: string;
}
