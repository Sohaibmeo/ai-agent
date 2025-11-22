import { IsArray, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CustomFromExistingDto {
  @IsString()
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

  @IsArray()
  ingredientItems!: {
    ingredientId: string;
    quantity: number;
    unit: string;
  }[];
}
