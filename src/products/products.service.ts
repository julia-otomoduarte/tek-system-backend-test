import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ListProductsDto } from './dto/list-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async getAllProducts(filters: ListProductsDto = {}) {
    const { sku, name, priceGte, priceLte, page = 1, limit = 10 } = filters;

    const where = {
      ...(sku && { sku: { contains: sku } }),
      ...(name && { name: { contains: name, mode: 'insensitive' as const } }),
      ...(priceGte !== undefined || priceLte !== undefined
        ? { price: { gte: priceGte, lte: priceLte } }
        : {}),
    };

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip, take: limit }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }

  async createProduct(createProductDto: CreateProductDto) {
    const { sku, name, price, stock } = createProductDto;

    if (price <= 0) {
      throw new BadRequestException('O preço unitário deve ser maior que zero');
    }

    if (stock < 0) {
      throw new BadRequestException('O estoque não pode ser negativo');
    }

    const existingProduct = await this.prisma.product.findUnique({
      where: { sku },
    });

    if (existingProduct) {
      throw new ConflictException('SKU de produto já cadastrado');
    }

    const existingName = await this.prisma.product.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existingName) {
      throw new ConflictException('Nome de produto já cadastrado');
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
      throw new NotFoundException('Produto não encontrado');
    }

    const { sku, name, price, stock } = updateProductDto;

    if (price !== undefined && price <= 0) {
      throw new BadRequestException('O preço unitário deve ser maior que zero');
    }

    if (stock !== undefined && stock < 0) {
      throw new BadRequestException('O estoque não pode ser negativo');
    }

    if (sku) {
      const existingProduct = await this.prisma.product.findUnique({
        where: { sku },
      });

      if (existingProduct && existingProduct.id !== id) {
        throw new ConflictException('SKU de produto já cadastrado');
      }
    }

    if (name) {
      const existingName = await this.prisma.product.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });

      if (existingName && existingName.id !== id) {
        throw new ConflictException('Nome de produto já cadastrado');
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
      throw new NotFoundException('Produto não encontrado');
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }
}
