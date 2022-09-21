import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto, Token } from './dto/login-dto';

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
  login(@Body() body: LoginDto): Promise<Token | unknown> {
    return this.userService.login(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('token')
  verifyToken(@Request() req) {
    return this.userService.verifyUser(req.user);
  }
}
