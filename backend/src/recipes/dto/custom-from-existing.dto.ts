import { IsArray, IsNumber, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class IngredientItemDto {
  @IsUUID()
  ingredientId!: string;

  @IsNumber()
  quantity!: number;

  @IsString()
  unit!: string;
}

export class CustomFromExistingDto {
  @IsUUID()
  baseRecipeId!: string;

  @IsString()
  newName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mealSlot?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  difficulty?: string;

  @IsOptional()
  @IsUUID()
  createdByUserId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientItemDto)
  ingredientItems!: IngredientItemDto[];
}
