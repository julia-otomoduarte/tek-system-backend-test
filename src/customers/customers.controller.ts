import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersDto } from './dto/list-customers.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  getAllCustomers(@Query() filters: ListCustomersDto) {
    return this.customersService.getAllCustomers(filters);
  }

  @Get(':id')
  getCustomerById(@Param('id') id: string) {
    return this.customersService.getCustomerById(id);
  }

  @Post()
  createCustomer(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.createCustomer(createCustomerDto);
  }

  @Put(':id')
  updateCustomer(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.updateCustomer(id, updateCustomerDto);
  }

  @Delete(':id')
  deleteCustomer(@Param('id') id: string) {
    return this.customersService.deleteCustomer(id);
  }
}
