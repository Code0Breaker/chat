import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Chat } from 'src/chat/entities/chat.entity';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { ChatService } from 'src/chat/chat.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(Chat)
    private chatRepo: Repository<Chat>,
    private chatService: ChatService,
  ) {}
  async create(createMessageDto) {
    const data = await this.messageRepo.save({
      content: createMessageDto.content,
      sender_id: createMessageDto.myId,
      chat: { _id: createMessageDto.chatId },
      user: { _id: createMessageDto.myId },
    });
    const newMessage = await this.messageRepo.findOne({
      where: { _id: data._id },
      relations: ['user', 'chat'],
    });
    return newMessage;
  }

  async findAllUnread(userId: string) {
    const data = await this.messageRepo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.user', 'sender')
      .leftJoinAndSelect('message.chat', 'chat')
      .leftJoin('chat.users', 'receiver')
      .where('receiver._id = :userId', { userId })
      .andWhere('sender._id <> :userId', { userId })
      .andWhere('message.isWatched = false')
      .getMany();
    return data;
  }

  findOne(id: number) {
    return `This action returns a #${id} message`;
  }

  async update(ids: string[]) {
    if (ids?.length > 0) {
      const data = await this.messageRepo.update(ids, { isWatched: true });
    }
  }

  remove(id: number) {
    return `This action removes a #${id} message`;
  }
}
