import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { UserService } from 'src/user/user.service';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  constructor(
    private readonly chatService: ChatService,
    private userService: UserService,
    ) {}

  @WebSocketServer() server;

  @SubscribeMessage('setup')
  setup(@MessageBody() userData, @ConnectedSocket() client: Socket) {
    console.log(client.id);
    this.userService.update(userData._id, { socketId: client.id });
    client.join(client.id);
    client.emit('connected');
  }

  @SubscribeMessage('join chat')
  joinChat(@MessageBody() room, @ConnectedSocket() client: Socket) {
    // client.join(room);
    console.log(room);
  }

  @SubscribeMessage('new message')
  create(@MessageBody() recievedMessage, @ConnectedSocket() client: Socket) {
    client.join(recievedMessage.chatRoomId);
    client
      .to(recievedMessage.chatRoomId)
      .emit('message recieved', recievedMessage);
    // client.leave(recievedMessage.chatRoomId);
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

  afterInit(server: Server) {
    console.log('Init');
  }

  handleConnection(client: Socket, data) {
    console.log('connected');
  }

  handleDisconnect(client: Socket) {
    console.log('disconnected');
  }
}
