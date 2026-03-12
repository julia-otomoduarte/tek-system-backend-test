import { IsNumber, IsString, Min } from 'class-validator';

export class OrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1, { message: 'A quantidade deve ser pelo menos 1' })
  quantity: number;
}
