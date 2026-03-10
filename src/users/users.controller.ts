/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Get('email/:email')
  @UseGuards(JwtAuthGuard)
  async getUserByEmail(@Param('email') email: string) {
    return this.usersService.getUserByEmail(email);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
