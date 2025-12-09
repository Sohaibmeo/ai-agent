import { IsArray, IsOptional, IsString } from 'class-validator';

export class ExplanationRequestDto {
  @IsString()
  question!: string;

  @IsOptional()
  context?: unknown;
}

export class ExplanationResponseDto {
  @IsString()
  explanation!: string;

  @IsArray()
  @IsString({ each: true })
  evidence!: string[];
}
