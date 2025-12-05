import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

class IngredientCandidateDto {
  @IsUUID()
  id!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  similarity_name?: string;
}

export class ChooseIngredientDto {
  @IsArray()
  @ArrayMinSize(1)
  candidates!: IngredientCandidateDto[];

  @IsOptional()
  @IsString()
  reasonText?: string;
}
