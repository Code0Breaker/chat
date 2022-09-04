import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from './schemas/chat.schema';
import { Messages, MessagesSchema } from './schemas/messages.schema';

@Module({
  imports:[
    MongooseModule.forFeature([
      {name:Chat.name, schema:ChatSchema},
      {name:Messages.name, schema:MessagesSchema},
    ])
  ],
  providers: [ChatGateway, ChatService]
})
export class ChatModule {}
