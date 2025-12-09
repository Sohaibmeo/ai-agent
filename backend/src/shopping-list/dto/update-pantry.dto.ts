import { IsBoolean, IsUUID } from 'class-validator';

export class UpdatePantryDto {
  @IsUUID()
  ingredientId!: string;

  @IsBoolean()
  hasItem!: boolean;

  @IsUUID()
  planId?: string;
}
