import {
  IsString,
  IsNumber,
  IsPositive,
  Min,
  IsOptional,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'O preço unitário deve ser maior que zero' })
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'O estoque não pode ser negativo' })
  stock?: number;
}
