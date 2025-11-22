import { IsString } from 'class-validator';

export class SetMealRecipeDto {
  @IsString()
  planMealId!: string;

  @IsString()
  newRecipeId!: string;
}
