import { Req, Request, UseGuards } from '@nestjs/common';
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
import { JwtAuthGuard } from 'src/user/guards/jwt-auth.guard';
import { WsGuard } from 'src/user/guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  users: { [key: string]: string } = {};

  handleConnection(@MessageBody() message: any, client: Socket) {
    // Handle client connection
    // console.log('Client connected: ' + client.id,message);
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
    

    this.server.to(message.chat._id).emit('chat', message);
  }

  @SubscribeMessage('new-contact-message')
  newContactMessage(
    @MessageBody() message: any,
    @ConnectedSocket() client: Socket,
  ) {
    
    this.server.to(message.chat._id).emit('chat', message);
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() roomId: string[],
    @ConnectedSocket() client: Socket,
    @Request() req
  ) {
    const userId = req.user;
    client.join(roomId||userId)
  }

  @SubscribeMessage('isTyping')
  isTyping(@MessageBody() userData) {
    this.server.to(userData.roomId).emit('isTyping', userData);
  }

  @SubscribeMessage('callUser')
  handleCallUser(
    @MessageBody() callData: any,
    @ConnectedSocket() client: Socket,
  ) {
  
    client.broadcast.to(callData.roomId).emit('reciveCall', callData);
  }

  @SubscribeMessage('answerCall')
  handleAnswerCall(
    @MessageBody()
    callData: {
      // signal: { type: string; sdp: string };
      to: {
        name: string;
        id: string;
        roomId: string;
      };
    },
    @ConnectedSocket() client: Socket,
  ) {
  
    client.broadcast
      .to(callData.to.roomId)
      .emit('callAccepted', callData);
  }


  @SubscribeMessage('acceptPeerConnection')
  handleAcceptPeerConnection(
    @MessageBody()
    acceptorData: {
        fullname: string;
        acceptorId: string;
        accept: boolean;
        roomId:string
      },
    @ConnectedSocket() client: Socket,
  ) {
  
    client.broadcast
      .to(acceptorData.roomId)
      .emit('acceptedPeerConnection', acceptorData);
  }


  @SubscribeMessage('sendingPeerSignal')
  handleSendPeerSignal(
    @MessageBody()
    callData: {
      roomId:string,
      signal: { type: string; sdp: string };
      from: {
        name: string;
        id: string;
      };
    },
    @ConnectedSocket() client: Socket,
  ) {
    
    client.broadcast
      .to(callData.roomId)
      .emit('recivePeerSignal', callData);
  }

}
