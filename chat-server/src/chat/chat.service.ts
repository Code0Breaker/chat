import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { Chat, ChatDocument } from './schemas/chat.schema';
import { Messages, MessagesDocument } from './schemas/messages.schema';

@Injectable()
export class ChatService {
  constructor(
    // @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(Messages.name) private messagesModel: Model<MessagesDocument>,
    ) {}
    
  create(createChatDto: CreateChatDto) {
    return 'This action adds a new chat';
  }

  findAll() {
    return `This action returns all chat`;
  }

  findOne(id: number) {
    return `This action returns a #${id} chat`;
  }

  update(id: number, updateChatDto: UpdateChatDto) {
    return `This action updates a #${id} chat`;
  }

  remove(id: number) {
    return `This action removes a #${id} chat`;
  }
}
