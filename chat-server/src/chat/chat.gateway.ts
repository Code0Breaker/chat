import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway {
  constructor(private readonly chatService: ChatService) {}

  @SubscribeMessage('setup')
  setup(
    @MessageBody() userData,
    @ConnectedSocket() client: Socket
  ){
    client.join(userData._id)
    // client.emit('connected')
  }

  @SubscribeMessage('join chat')
  joinChat(
    @MessageBody() room,
    @ConnectedSocket() client: Socket
  ){
    client.join(room)
  }


  @SubscribeMessage('new message')
  create(
    @MessageBody() recievedMessage,
    @ConnectedSocket() client: Socket
  ) {
      client.join(recievedMessage.chatRoomId)
      client.to(recievedMessage.chatRoomId).emit("message recieved", recievedMessage);
  }

  @SubscribeMessage('findAllChat')
  findAll() {
    return this.chatService.findAll();
  }

  @SubscribeMessage('findOneChat')
  findOne(@MessageBody() id: number) {
    return this.chatService.findOne(id);
  }

  @SubscribeMessage('updateChat')
  update(@MessageBody() updateChatDto: UpdateChatDto) {
    return this.chatService.update(updateChatDto.id, updateChatDto);
  }

  @SubscribeMessage('removeChat')
  remove(@MessageBody() id: number) {
    return this.chatService.remove(id);
  }
}
