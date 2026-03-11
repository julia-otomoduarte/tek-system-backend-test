import { IsNumber, IsString, IsPositive, Min } from 'class-validator';

export class OrderItemDto {
  @IsString()
  productId: string;

  @IsString()
  productName: string;

  @IsString()
  sku: string;

  @IsNumber()
  @Min(1, { message: 'A quantidade deve ser pelo menos 1' })
  quantity: number;

  @IsNumber()
  @IsPositive({ message: 'O preço unitário deve ser maior que zero' })
  unitPrice: number;
}
