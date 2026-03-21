import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class ListOrderDto {
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalGte?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalLte?: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
