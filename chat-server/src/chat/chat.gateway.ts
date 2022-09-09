import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayDisconnect,
  OnGatewayInit,
  OnGatewayConnection,
  MessageBody,
  ConnectedSocket,
  WsResponse,
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
  // connectedRooms = new Set();
  private readonly logger: Logger = new Logger(ChatGateway.name);
  @WebSocketServer() server: Server;

  afterInit(client: Socket) {
    this.logger.log('Initialized SocketGateway');
    // console.log(client);

    // [...this.connectedRooms].map((room: string) => {
    //   client.join(room);
    // });
  }

  handleConnection(client: Socket) {
    this.logger.log(`[connection] from client (${client.id})`);
    // console.log([...this.connectedRooms], 'connect');

    // [...this.connectedRooms].map((room: string) => {
    //   client.join(room);
    // });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[disconnection] from client(${client.id})`);
  }

  @SubscribeMessage('setup')
  async handleJoinRoom(client: Socket, @MessageBody() userData) {
    const rooms = await this.userService.findAll(userData);
    // console.log(rooms);

    await this.logger.log(
      `[joinWhiteboard] ${userData}(${client.id}) joins ${userData}`,
    );

    await rooms.map((item) => {
      client.join(item._id.toString());
      client.to(item._id.toString()).emit('joined');
    });
  }

  @SubscribeMessage('join chat')
  joinChat(@MessageBody() room, @ConnectedSocket() client: Socket) {
    // client.join(room);
    // console.log(room);
  }

  @SubscribeMessage('new message')
  create(client: Socket, @MessageBody() recievedMessage) {
    // await client.join(recievedMessage.chatRoomId);
    // console.log(recievedMessage, 'room message');
    // console.log(recievedMessage.chatRoomId, 'room');
    // console.log(client.rooms.has(recievedMessage.chatRoomId), 'room');

    // if (client.rooms.has(recievedMessage.chatRoomId)) {
    this.logger.log(
      `[sent a new message] from (${client.id}) to ${recievedMessage.chatRoomId}`,
    );
    client
      .to(recievedMessage.chatRoomId)
      .emit('message recieved', recievedMessage);
    // }

    // client
    //   .to(recievedMessage.chatRoomId)
    //   .emit('message recieved', recievedMessage);
    // client.leave(recievedMessage.chatRoomId);
  }

  // @SubscribeMessage('findAllChat')
  // findAll() {
  //   return this.chatService.findAll();
  // }

  // @SubscribeMessage('findOneChat')
  // findOne(@MessageBody() id: number) {
  //   return this.chatService.findOne(id);
  // }

  // @SubscribeMessage('updateChat')
  // update(@MessageBody() updateChatDto: UpdateChatDto) {
  //   return this.chatService.update(updateChatDto.id, updateChatDto);
  // }

  // @SubscribeMessage('removeChat')
  // remove(@MessageBody() id: number) {
  //   return this.chatService.remove(id);
  // }
}
