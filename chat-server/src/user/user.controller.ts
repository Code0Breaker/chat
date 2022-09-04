import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto, Token } from 'src/chat/dto/login-dto';
import { JwtStrategy } from './jwt.strategy';
import { AuthGuard } from '@nestjs/passport';
import { LocalAuthGuard } from './guards/local-auth.guard';

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
    console.log(req);
    return this.userService.verifyUser(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('search')
  search(@Body('text') text){
    return this.userService.search(text)
  }

  @UseGuards(JwtAuthGuard)
  @Post('allChatList')
  allChatList(@Body('_id') id){
    console.log(id);
    
    return this.userService.findAll(id)
  }

  @UseGuards(JwtAuthGuard)
  @Post('select')
  selectUser(@Body('_id') id:string[], @Request() req){
    console.log(id, req.user.token._id);
    
    return this.userService.find(id, req.user.token._id)
  } 

  @UseGuards(JwtAuthGuard)
  @Post('createMessage')
  createMessage(
    @Request() req, 
    @Body('chatId') chatId, 
    @Body('content') content,
    @Body('myId') myId,
    ){
    return this.userService.createMessage(chatId, content, myId)
  }
}
