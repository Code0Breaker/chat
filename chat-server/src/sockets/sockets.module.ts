import { Module } from '@nestjs/common';
import { SocketsService } from './sockets.service';
import { ChatGateway } from './sockets.gateway';
import { UserModule } from 'src/user/user.module';
import { UserService } from 'src/user/user.service';
import { JwtModule } from '@nestjs/jwt';
import { User } from 'src/user/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from 'src/messages/messages.service';
import { Message } from 'src/messages/entities/message.entity';
import { Chat } from 'src/chat/entities/chat.entity';
import { ChatService } from 'src/chat/chat.service';
import { ConnectedIds } from 'src/chat/entities/connectedIds.entity';


@Module({
  imports: [
    UserModule, 
    TypeOrmModule.forFeature([User,Message,Chat,ConnectedIds]),
    JwtModule.register({
    secret: 'j--wtCo-nsta-nts.sec-ret',
    signOptions: { expiresIn: '60m' },
  }),
],
  providers: [ChatGateway, SocketsService, UserService, MessagesService,ChatService],
})
export class SocketsModule { }
