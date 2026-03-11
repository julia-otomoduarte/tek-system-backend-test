import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ListProductsDto } from './dto/list-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async getAllProducts(filters: ListProductsDto = {}) {
    const { sku, name, price_gte, price_lte } = filters;

    return this.prisma.product.findMany({
      where: {
        ...(sku && { sku: { contains: sku } }),
        ...(name && { name: { contains: name, mode: 'insensitive' } }),
        ...(price_gte !== undefined || price_lte !== undefined
          ? { price: { gte: price_gte, lte: price_lte } }
          : {}),
      },
    });
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new Error('Produto não encontrado');
    }
    return product;
  }

  async createProduct(createProductDto: CreateProductDto) {
    const { sku, name, price, stock } = createProductDto;

    if (price <= 0) {
      throw new Error('O preço unitário deve ser maior que zero');
    }

    if (stock < 0) {
      throw new Error('O estoque não pode ser negativo');
    }

    const existingProduct = await this.prisma.product.findUnique({
      where: { sku },
    });

    if (existingProduct) {
      throw new Error('SKU de produto já cadastrado');
    }

    const existingName = await this.prisma.product.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existingName) {
      throw new Error('Nome de produto já cadastrado');
    }

    return this.prisma.product.create({
      data: createProductDto,
    });
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    const { sku, name, price, stock } = updateProductDto;

    if (price !== undefined && price <= 0) {
      throw new Error('O preço unitário deve ser maior que zero');
    }

    if (stock !== undefined && stock < 0) {
      throw new Error('O estoque não pode ser negativo');
    }

    if (sku) {
      const existingProduct = await this.prisma.product.findUnique({
        where: { sku },
      });

      if (existingProduct && existingProduct.id !== id) {
        throw new Error('SKU de produto já cadastrado');
      }
    }

    if (name) {
      const existingName = await this.prisma.product.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });

      if (existingName && existingName.id !== id) {
        throw new Error('Nome de produto já cadastrado');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async deleteProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }
}
