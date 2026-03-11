import {
  IsOptional,
  IsString,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsNumber()
  @IsPositive({ message: 'O preço unitário deve ser maior que zero' })
  price: number;

  @IsNumber()
  @Min(0, { message: 'O estoque não pode ser negativo' })
  stock: number;
}
