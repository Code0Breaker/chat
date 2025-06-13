import { Request } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface CallData {
  roomId: string;
  signalData?: any;
  from: {
    name: string;
    id: string;
  };
  to?: {
    name: string;
    id: string;
    roomId: string;
  };
}

interface ActiveCall {
  roomId: string;
  participants: string[];
  startTime: Date;
  callType: 'video' | 'audio';
  status: 'connecting' | 'connected' | 'ended';
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  users: { [key: string]: string } = {};
  activeCalls: Map<string, ActiveCall> = new Map();
  userSocketMap: Map<string, string> = new Map(); // userId -> socketId mapping

  handleConnection(client: Socket) {
    try {
      if (!client || !client.id) {
        console.error('Invalid client connection - client or client.id is undefined');
        return;
      }
      
      console.log(`Client connected: ${client.id}`);
      
      // Initialize client data
      client.data = client.data || {};
      
      // Set up client event listeners for better error handling
      client.on('error', (error) => {
        console.error(`Socket error for client ${client.id}:`, error);
      });
      
      client.on('disconnect', (reason) => {
        console.log(`Client ${client.id} disconnected. Reason: ${reason}`);
      });
      
    } catch (error) {
      console.error('Error in handleConnection:', error);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    // Clean up user data
    delete this.users[client.id];
    
    // Clean up user socket mapping
    for (const [userId, socketId] of this.userSocketMap.entries()) {
      if (socketId === client.id) {
        this.userSocketMap.delete(userId);
        break;
      }
    }
    
    // Handle active calls cleanup
    this.handleCallCleanupOnDisconnect(client.id);
    
    // Emit updated users list
    this.server.emit('users', Object.values(this.users));
  }

  private handleCallCleanupOnDisconnect(socketId: string) {
    // Find and end any active calls involving this socket
    for (const [roomId, call] of this.activeCalls.entries()) {
      if (call.participants.some(p => this.userSocketMap.get(p) === socketId)) {
        // Notify other participants
        this.server.to(roomId).emit('callEnded', {
          reason: 'participant_disconnected',
          roomId
        });
        
        // Remove the call
        this.activeCalls.delete(roomId);
        console.log(`Call ended due to disconnection in room: ${roomId}`);
      }
    }
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

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, userId } = data;
    
    // Store user-socket mapping
    if (userId) {
      this.userSocketMap.set(userId, client.id);
      this.users[client.id] = userId;
    }
    
    // Join the room
    client.join(roomId);
    console.log(`User ${userId} joined room ${roomId}`);
    
    // Emit updated users list
    this.server.emit('users', Object.values(this.users));
  }

  @SubscribeMessage('isTyping')
  isTyping(@MessageBody() userData: any) {
    this.server.to(userData.roomId).emit('isTyping', userData);
  }

  @SubscribeMessage('callUser')
  handleCallUser(
    @MessageBody() callData: CallData,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log('Call User:', JSON.stringify(callData, null, 2));
      
      // Create or update active call
      const activeCall: ActiveCall = {
        roomId: callData.roomId,
        participants: [callData.from.id],
        startTime: new Date(),
        callType: 'video',
        status: 'connecting'
      };
      this.activeCalls.set(callData.roomId, activeCall);
      
      // Broadcast call to room (excluding sender)
      client.broadcast.to(callData.roomId).emit('reciveCall', {
        ...callData,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Call initiated in room ${callData.roomId} by ${callData.from.name}`);
    } catch (error) {
      console.error('Error handling call user:', error);
      client.emit('callError', {
        message: 'Failed to initiate call',
        error: error.message
      });
    }
  }

  @SubscribeMessage('answerCall')
  handleAnswerCall(
    @MessageBody() callData: {
      signal: { type: string; sdp: string };
      to: {
        name: string;
        id: string;
        roomId: string;
      };
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log('Answer Call:', JSON.stringify(callData, null, 2));
      
      // Update active call
      const activeCall = this.activeCalls.get(callData.to.roomId);
      if (activeCall) {
        if (!activeCall.participants.includes(callData.to.id)) {
          activeCall.participants.push(callData.to.id);
        }
        activeCall.status = 'connected';
      }
      
      // Broadcast answer to room
      client.broadcast.to(callData.to.roomId).emit('callAccepted', {
        ...callData,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Call answered in room ${callData.to.roomId}`);
    } catch (error) {
      console.error('Error handling answer call:', error);
      client.emit('callError', {
        message: 'Failed to answer call',
        error: error.message
      });
    }
  }

  @SubscribeMessage('rejectCall')
  handleRejectCall(
    @MessageBody() data: { roomId: string; reason?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log(`Call rejected in room ${data.roomId}`);
      
      // Remove active call
      this.activeCalls.delete(data.roomId);
      
      // Notify caller
      client.broadcast.to(data.roomId).emit('callRejected', {
        roomId: data.roomId,
        reason: data.reason || 'Call rejected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling reject call:', error);
    }
  }

  @SubscribeMessage('endCall')
  handleEndCall(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log(`Call ended in room ${data.roomId}`);
      
      // Get active call info for logging
      const activeCall = this.activeCalls.get(data.roomId);
      if (activeCall) {
        const callDuration = new Date().getTime() - activeCall.startTime.getTime();
        console.log(`Call duration: ${Math.round(callDuration / 1000)} seconds`);
      }
      
      // Remove active call
      this.activeCalls.delete(data.roomId);
      
      // Notify all participants
      this.server.to(data.roomId).emit('callEnded', {
        roomId: data.roomId,
        reason: 'call_ended',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling end call:', error);
    }
  }

  @SubscribeMessage('acceptPeerConnection')
  handleAcceptPeerConnection(
    @MessageBody()
    acceptorData: {
      fullname: string;
      acceptorId: string;
      accept: boolean;
      roomId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log('Accept Peer Connection:', JSON.stringify(acceptorData, null, 2));
      
      client.broadcast
        .to(acceptorData.roomId)
        .emit('acceptedPeerConnection', {
          ...acceptorData,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error handling accept peer connection:', error);
      client.emit('callError', {
        message: 'Failed to accept peer connection',
        error: error.message
      });
    }
  }

  @SubscribeMessage('sendingPeerSignal')
  handleSendPeerSignal(
    @MessageBody()
    callData: {
      roomId: string;
      signal: { type: string; sdp: string };
      from: {
        name: string;
        id: string;
      };
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log('Sending Peer Signal:', JSON.stringify(callData, null, 2));
      
      client.broadcast.to(callData.roomId).emit('recivePeerSignal', {
        ...callData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling peer signal:', error);
      client.emit('callError', {
        message: 'Failed to send peer signal',
        error: error.message
      });
    }
  }

  @SubscribeMessage('new-ice-candidate')
  handleNewIceCandidate(
    @MessageBody() message: { 
      candidate: RTCIceCandidate; 
      roomId: string;
      from?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log('New ICE Candidate:', JSON.stringify(message, null, 2));
      
      client.broadcast.to(message.roomId).emit('new-ice-candidate', {
        ...message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
      client.emit('callError', {
        message: 'Failed to exchange ICE candidate',
        error: error.message
      });
    }
  }

  // New event handlers for enhanced functionality

  @SubscribeMessage('toggleAudio')
  handleToggleAudio(
    @MessageBody() data: { roomId: string; muted: boolean; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.broadcast.to(data.roomId).emit('participantAudioToggled', {
      userId: data.userId,
      muted: data.muted,
      timestamp: new Date().toISOString()
    });
  }

  @SubscribeMessage('toggleVideo')
  handleToggleVideo(
    @MessageBody() data: { roomId: string; muted: boolean; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.broadcast.to(data.roomId).emit('participantVideoToggled', {
      userId: data.userId,
      muted: data.muted,
      timestamp: new Date().toISOString()
    });
  }

  @SubscribeMessage('screenShareStart')
  handleScreenShareStart(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.broadcast.to(data.roomId).emit('participantScreenShareStarted', {
      userId: data.userId,
      timestamp: new Date().toISOString()
    });
  }

  @SubscribeMessage('screenShareEnd')
  handleScreenShareEnd(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.broadcast.to(data.roomId).emit('participantScreenShareEnded', {
      userId: data.userId,
      timestamp: new Date().toISOString()
    });
  }

  @SubscribeMessage('callQuality')
  handleCallQuality(
    @MessageBody() data: { 
      roomId: string; 
      userId: string; 
      quality: 'good' | 'fair' | 'poor';
      stats?: any;
    },
    @ConnectedSocket() client: Socket,
  ) {
    // Log quality issues for monitoring
    if (data.quality === 'poor') {
      console.warn(`Poor call quality reported by ${data.userId} in room ${data.roomId}`);
    }
    
    client.broadcast.to(data.roomId).emit('participantQualityUpdate', {
      userId: data.userId,
      quality: data.quality,
      timestamp: new Date().toISOString()
    });
  }

  // Admin/monitoring endpoints
  @SubscribeMessage('getActiveCalls')
  handleGetActiveCalls(@ConnectedSocket() client: Socket) {
    const callsInfo = Array.from(this.activeCalls.entries()).map(([roomId, call]) => ({
      roomId,
      participantCount: call.participants.length,
      duration: new Date().getTime() - call.startTime.getTime(),
      status: call.status,
      callType: call.callType
    }));
    
    client.emit('activeCallsInfo', callsInfo);
  }
}
