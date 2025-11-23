import { ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

class IngredientCandidateDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;
}

export class ChooseIngredientDto {
  @IsArray()
  @ArrayMinSize(1)
  candidates!: IngredientCandidateDto[];

  @IsOptional()
  @IsString()
  reasonText?: string;
}
