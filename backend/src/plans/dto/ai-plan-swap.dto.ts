import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class AiPlanSwapDto {
  @IsString()
  userId!: string;

  @IsString()
  weeklyPlanId!: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  planDayIds?: string[];

  @IsOptional()
  @IsUUID()
  planMealId?: string;

  @IsOptional()
  @IsUUID()
  recipeId?: string;

  /**
   * High-level intent type from the frontend.
   * Examples:
   *  - "bulk_days_modify"
   *  - "day_modify"
   *  - "meal_swap_auto"
   *  - "meal_swap_describe"
   *  - "meal_recipe_edit"
   */
  @IsOptional()
  @IsString()
  type?: string;

  /**
   * Free-text note from the user ("make it cheaper", "no broccoli", etc.)
   */
  @IsOptional()
  @IsString()
  note?: string;

  /**
   * Extra frontend context (optional) – keep as free JSON.
   */
  @IsOptional()
  context?: Record<string, any>;
}
