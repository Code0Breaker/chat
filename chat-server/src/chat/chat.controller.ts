import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { Observable, interval, map } from 'rxjs';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // @UseGuards(JwtAuthGuard)
  @Post('search')
  search(@Body('text') text) {
    return this.chatService.search(text);
  }

  // @UseGuards(JwtAuthGuard)
  @Post('create-room')
  selectChat(@Body('_id') id: string[], @Body('myId') myId: string) {
    return this.chatService.create(id, myId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getAllRooms')
  getAllRooms(@Request() req) {
    console.log(req.user);
    return this.chatService.getRoomsForUser(req.user._id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getChat/:id')
  getChat(@Param('id') roomId: string) {
    return this.chatService.getChat(roomId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getMessages/:id')
  getMessages(@Param('id') id) {
    return this.chatService.findOne(id);
  }
}
