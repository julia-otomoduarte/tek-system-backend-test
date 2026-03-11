import { Injectable } from '@nestjs/common';
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
    const customer_email = createCustomerDto.email;
    const customer_document = createCustomerDto.document;
    const customer_phone = createCustomerDto.phone;

    const treated_phone = customer_phone.replace(/\D/g, '');
    const treated_document = customer_document.replace(/\D/g, '');

    try {
      validateDocument(customer_document);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }

    const found_customer = await this.prisma.customer.findFirst({
      where: {
        OR: [
          { email: customer_email },
          { document: treated_document },
          { phone: treated_phone },
        ],
      },
    });

    if (found_customer) {
      if (found_customer.email === customer_email) {
        throw new Error('Email de cliente já cadastrado');
      }
      if (found_customer.document === treated_document) {
        throw new Error('Documento de cliente já cadastrado');
      }
      if (found_customer.phone === treated_phone) {
        throw new Error('Telefone de cliente já cadastrado');
      }
    }

    return this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        document: treated_document,
        phone: treated_phone,
      },
    });
  }

  async updateCustomer(id: string, updateCustomerDto: UpdateCustomerDto) {
    const customer_email = updateCustomerDto.email;
    const customer_document = updateCustomerDto.document;
    const customer_phone = updateCustomerDto.phone;

    const treated_phone = customer_phone?.replace(/\D/g, '');
    const treated_document = customer_document?.replace(/\D/g, '');

    if (customer_document) {
      try {
        validateDocument(customer_document);
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error));
      }
    }

    const customer = await this.prisma.customer.findUnique({ where: { id } });

    if (!customer) {
      throw new Error('Cliente não encontrado');
    }

    const found_customer = await this.prisma.customer.findFirst({
      where: {
        id: { not: id },
        OR: [
          { email: customer_email },
          { document: treated_document },
          { phone: treated_phone },
        ],
      },
    });

    if (found_customer) {
      if (found_customer.email === customer_email) {
        throw new Error('Email de cliente já cadastrado');
      }
      if (found_customer.document === treated_document) {
        throw new Error('Documento de cliente já cadastrado');
      }
      if (found_customer.phone === treated_phone) {
        throw new Error('Telefone de cliente já cadastrado');
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...updateCustomerDto,
        document: treated_document,
        phone: treated_phone,
      },
    });
  }

  async getAllCustomers(filters: ListCustomersDto = {}) {
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

    return this.prisma.customer.findMany({ where });
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
      throw new Error('Cliente não encontrado');
    }
    return this.prisma.customer.delete({ where: { id } });
  }
}
