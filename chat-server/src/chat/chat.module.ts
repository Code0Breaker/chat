import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { UserService } from 'src/user/user.service';
import { UserModule } from 'src/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Chat } from './entities/chat.entity';
import { ConnectedIds } from './entities/connectedIds.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Chat, ConnectedIds])],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
