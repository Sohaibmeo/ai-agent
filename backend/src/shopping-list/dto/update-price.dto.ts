import { IsNumber, IsUUID, IsOptional, IsString } from 'class-validator';

export class UpdatePriceDto {
  @IsUUID()
  ingredientId!: string;

  @IsNumber()
  pricePaid!: number;

  @IsNumber()
  quantity!: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsUUID()
  planId?: string;
}
