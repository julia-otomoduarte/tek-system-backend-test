import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
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
}
