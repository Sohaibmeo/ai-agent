import { IsString, IsUUID } from 'class-validator';

export class SetMealRecipeDto {
  @IsUUID()
  planMealId!: string;

  @IsUUID()
  newRecipeId!: string;
}
