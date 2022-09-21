import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

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
    selectChat(@Body('_id') id: string[], @Body('myId') myId:string){
      return this.chatService.create(id, myId)
    }

    // @UseGuards(JwtAuthGuard)
    @Post('getAllRooms')
    getAllRooms(@Body('myId') myId:string){
      return this.chatService.getRoomsForUser(myId)
    }

    @Get('getMessages/:id')
    getMessages(@Param('id') id){
      return this.chatService.findOne(id)
    }
}
