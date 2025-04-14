import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login-dto';
import { Response } from 'express';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body() body: CreateUserDto) {
    try {
      await this.userService.register(body);
      // return await this.userService.login({
      //   email: body.email,
      //   password: body.password,
      // });
    } catch (error) {
      throw error.message;
    }
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Res() res: Response): Promise<void> {
    const data = await this.userService.login(body);
    res.cookie('token', data.token);
    res.send(data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('token')
  verifyToken(@Request() req) {
    return this.userService.verifyUser(req.user);
  }
}
