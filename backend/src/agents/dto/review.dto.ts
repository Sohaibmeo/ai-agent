import { IsOptional, IsString } from 'class-validator';

export class ReviewRequestDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  currentPlanSnippet?: unknown;
}
