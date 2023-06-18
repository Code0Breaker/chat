import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { In, Like, Repository } from 'typeorm';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { Chat } from './entities/chat.entity';
import { ConnectedIds } from './entities/connectedIds.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Chat)
    private chatRepo: Repository<Chat>,
    @InjectRepository(ConnectedIds)
    private connectedIdsRepo: Repository<ConnectedIds>,
  ) {}
  async search(keyword) {
    const data = await this.userRepo.find({
      where: {
        fullname: Like(`%${keyword}%`),
      },
      select: ['_id', 'fullname', 'email', 'pic'],
    });
    return data;
  }

  async create(id: string[], myId: string) {
    const users = await this.userRepo.find({ where: { _id: In(id) } });
    const chatName: string = users.map((item) => item.fullname).join(', ');
    const forRel = await this.userRepo.find({
      where: { _id: In([...id, myId]) },
    });
    const data = await this.chatRepo.save({
      // chatName: chatName,
      users: forRel,
    });
    const messages = await this.chatRepo.find({
      where: { _id: data._id },
      relations: ['messages'],
    });
    return { roomId: data._id, messages };
  }

  async getRoomsForUser(userId) {
    const query = await this.chatRepo
      .createQueryBuilder('chat')
      .leftJoin('chat.users', 'users')
      .where('users._id = :userId', { userId })
      .leftJoinAndSelect('chat.users', 'all_users')
      .orderBy('chat.updated_at', 'DESC')
      .getMany();
    return query;
  }

  async findOne(roomId) {
    const data = await this.chatRepo.findOne({
      where: { _id: roomId },
      relations: ['messages', 'messages.user'],
    });
    return data;
  }
}
