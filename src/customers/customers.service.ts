import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersDto } from './dto/list-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { validateDocument } from './customers.utils';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async createCustomer(createCustomerDto: CreateCustomerDto) {
    const customerEmail = createCustomerDto.email;
    const customerDocument = createCustomerDto.document;
    const customerPhone = createCustomerDto.phone;

    const treatedPhone = customerPhone.replace(/\D/g, '');
    const treatedDocument = customerDocument.replace(/\D/g, '');

    try {
      validateDocument(customerDocument);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : String(error),
      );
    }

    const foundCustomer = await this.prisma.customer.findFirst({
      where: {
        OR: [
          { email: customerEmail },
          { document: treatedDocument },
          { phone: treatedPhone },
        ],
      },
    });

    if (foundCustomer) {
      if (foundCustomer.email === customerEmail) {
        throw new ConflictException('Email de cliente já cadastrado');
      }
      if (foundCustomer.document === treatedDocument) {
        throw new ConflictException('Documento de cliente já cadastrado');
      }
      if (foundCustomer.phone === treatedPhone) {
        throw new ConflictException('Telefone de cliente já cadastrado');
      }
    }

    return this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        document: treatedDocument,
        phone: treatedPhone,
      },
    });
  }

  async updateCustomer(id: string, updateCustomerDto: UpdateCustomerDto) {
    const customerEmail = updateCustomerDto.email;
    const customerDocument = updateCustomerDto.document;
    const customerPhone = updateCustomerDto.phone;

    const treatedPhone = customerPhone?.replace(/\D/g, '');
    const treatedDocument = customerDocument?.replace(/\D/g, '');

    if (customerDocument) {
      try {
        validateDocument(customerDocument);
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    const customer = await this.prisma.customer.findUnique({ where: { id } });

    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const foundCustomer = await this.prisma.customer.findFirst({
      where: {
        id: { not: id },
        OR: [
          { email: customerEmail },
          { document: treatedDocument },
          { phone: treatedPhone },
        ],
      },
    });

    if (foundCustomer) {
      if (foundCustomer.email === customerEmail) {
        throw new ConflictException('Email de cliente já cadastrado');
      }
      if (foundCustomer.document === treatedDocument) {
        throw new ConflictException('Documento de cliente já cadastrado');
      }
      if (foundCustomer.phone === treatedPhone) {
        throw new ConflictException('Telefone de cliente já cadastrado');
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...updateCustomerDto,
        document: treatedDocument,
        phone: treatedPhone,
      },
    });
  }

  async getAllCustomers(filters: ListCustomersDto = {}) {
    const { page = 1, limit = 10 } = filters;
    const where: Prisma.CustomerWhereInput = {};

    if (filters.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }

    if (filters.email) {
      where.email = { contains: filters.email, mode: 'insensitive' };
    }

    if (filters.phone) {
      where.phone = { equals: filters.phone, mode: 'insensitive' };
    }

    const addressFilter: Prisma.AddressWhereInput = {};
    if (filters.city) {
      addressFilter.city = { equals: filters.city };
    }
    if (filters.state) {
      addressFilter.state = { equals: filters.state };
    }
    if (Object.keys(addressFilter).length > 0) {
      where.address = { is: addressFilter };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({ where, skip, take: limit }),
      this.prisma.customer.count({ where }),
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

  async getCustomerById(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });

    if (!customer) {
      throw new Error('Cliente não encontrado');
    }
    return customer;
  }

  async deleteCustomer(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });

    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const existingOrder = await this.prisma.order.findFirst({
      where: { customerId: id },
    });

    if (existingOrder) {
      throw new ConflictException(
        'Cliente possui pedidos cadastrados e não pode ser deletado',
      );
    }

    return this.prisma.customer.delete({ where: { id } });
  }
}
