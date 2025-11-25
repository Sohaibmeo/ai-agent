import { IsUUID } from 'class-validator';

export class AvoidIngredientDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  ingredientId!: string;
}
