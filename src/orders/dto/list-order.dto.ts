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
  totalGte?: number;

  @IsOptional()
  @IsNumber()
  totalLte?: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
