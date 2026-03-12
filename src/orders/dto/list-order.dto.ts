import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class ListOrderDto {
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsNumber()
  total_gte?: number;

  @IsOptional()
  @IsNumber()
  total_lte?: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
