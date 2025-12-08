import { IsString } from 'class-validator';

export class EmailListDto {
  @IsString()
  planId!: string;
}
