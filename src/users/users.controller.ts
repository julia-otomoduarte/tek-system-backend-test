/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Get(':id')
  async getUserById(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string },
  ) {
    if (currentUser.id !== id) {
      throw new ForbiddenException('Acesso negado');
    }
    return this.usersService.getUserById(id);
  }

  @Get('email/:email')
  async getUserByEmail(
    @Param('email') email: string,
    @CurrentUser() currentUser: { id: string; email: string },
  ) {
    if (currentUser.email !== email) {
      throw new ForbiddenException('Acesso negado');
    }
    return this.usersService.getUserByEmail(email);
  }

  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: { id: string },
  ) {
    if (currentUser.id !== id) {
      throw new ForbiddenException('Acesso negado');
    }
    return this.usersService.updateUser(id, dto);
  }

  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string },
  ) {
    if (currentUser.id !== id) {
      throw new ForbiddenException('Acesso negado');
    }
    return this.usersService.deleteUser(id);
  }
}
