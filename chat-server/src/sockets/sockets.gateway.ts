import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  users: { [key: string]: string } = {};

  handleConnection(client: Socket) {
    // Handle client connection
    console.log('Client connected: ' + client.id);
  }

  handleDisconnect(client: Socket) {
    // Handle client disconnection
    console.log('Client disconnected: ' + client.id);
    delete this.users[client.id];
    this.server.emit('users', Object.values(this.users));
  }

  @SubscribeMessage('chat')
  handleMessage(
    @MessageBody() message: any,
    @ConnectedSocket() client: Socket,
  ) {
    console.log(message);

    this.server.to(message.chat._id).emit('chat', message);
  }

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() roomId: string[],
    @ConnectedSocket() client: Socket,
  ) {
    client.join(roomId);
  }

  @SubscribeMessage('isTyping')
  isTyping(@MessageBody() userData) {
    this.server.to(userData.roomId).emit('isTyping', userData);
  }
}
