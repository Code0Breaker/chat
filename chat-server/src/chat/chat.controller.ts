import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('search')
  search(@Body('text') text) {
    return this.chatService.search(text);
  }

  @Post('create-room')
  selectChat(@Body('_id') id: string[], @Body('myId') myId: string) {
    return this.chatService.create(id, myId);
  }

  @Get('getAllRooms')
  getAllRooms(@Request() req) {
    console.log(req.user);
    return this.chatService.getRoomsForUser(req.user._id);
  }

  @Get('getChat/:id')
  getChat(@Param('id') roomId: string) {
    return this.chatService.getChat(roomId);
  }

  @Get('getMessages/:id')
  getMessages(@Param('id') id) {
    return this.chatService.findOne(id);
  }
}
