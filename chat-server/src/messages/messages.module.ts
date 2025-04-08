import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { Chat } from 'src/chat/entities/chat.entity';
import { ChatService } from 'src/chat/chat.service';
import { User } from 'src/user/entities/user.entity';
import { ConnectedIds } from 'src/chat/entities/connectedIds.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Message, Chat, User,ConnectedIds])],
  controllers: [MessagesController],
  providers: [MessagesService, ChatService],
})
export class MessagesModule {}
