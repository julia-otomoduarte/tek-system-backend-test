import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LocationsModule } from './locations/locations.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customer.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    LocationsModule,
    CustomersModule,
    ProductsModule,
  ],
})
export class AppModule {}
