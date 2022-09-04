import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from 'src/chat/dto/login-dto';
import { Chat, ChatDocument } from 'src/chat/schemas/chat.schema';
import { Messages, MessagesDocument } from 'src/chat/schemas/messages.schema';
@Injectable()
export class UserService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(User.name) 
    private userModel: Model<UserDocument>,
    @InjectModel(Chat.name) 
    private chatModel: Model<ChatDocument>,
    @InjectModel(Messages.name) 
    private messageModel: Model<MessagesDocument>
    ) {}

  async register(body) {
      try {
        const saltOrRounds = 10;
        const hash = await bcrypt.hash(body.password, saltOrRounds);
        const newUser = new this.userModel({...body,password: hash})
        newUser.save()
        // return newUser
        return new HttpException(
          {
            status: HttpStatus.CREATED,
            success: `${newUser.fullname} successfully registered`,
          },
          HttpStatus.CREATED,
        );
      } catch (err) {
        throw err;
      }
  }

  async login(data: LoginDto) {
    const user = await this.userModel.findOne({ email: data.email });
   console.log('asdasdasdasdasdasd',data);
   
    try {
      if (user) {
        const isMatch = await bcrypt.compare(data.password, user.password);
        if (isMatch) {
          return {
            token: this.jwtService.sign({
              _id:user._id,
              fullname: user.fullname,
            }),
            fullname: user.fullname,
            _id:user._id,
            pic:user.pic
          };
        } else {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              error: 'Invalid password',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      } else {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'User not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }
    } catch (err) {
      throw err;
    }
  }
  
  async verifyUser(user) {
    const verified = await this.userModel.findOne(user);
    return {
      refresh_token: this.jwtService.sign({
        _id:verified._id,
        fullname: verified.fullname,
      }),
      _id:verified._id
    };
  }

  async search(text){
    const data = await this.userModel.find({fullname:{'$regex': text}})
    return data
  }

  async findAll(myId){
    try {
      const data = await this.chatModel.find({users:{'$in':[myId]}})
      .populate({
        path: "users",
        model:User.name,
        select:['_id', 'fullname', 'pic']
      })
      return data
    } catch (error) {
      return error.messages
    }
  }

  async find(selectedIds:string[], myId){
    try {
      const findRoom = await this.chatModel.findOne({users:{'$all':[...selectedIds, myId]}})
      if(!findRoom){
        const createNewRoom = new this.chatModel({users:[...selectedIds, myId]})
        createNewRoom.save()
        const messages = await this.messageModel.find({ chatRoomId: createNewRoom._id }).sort({createdAt:1})
        return {roomId:createNewRoom._id, messages}
      }else{
        const messages = await this.messageModel.find({ chatRoomId: findRoom._id }).sort({createdAt:1})
        return {roomId:findRoom._id, messages}
      }
    } catch (error) {
      return error.messages
    }
  } 

  async createMessage(chatId,content, user_id){
    try {
      const message = new this.messageModel({
        sender: user_id,
        content: content,
        chatRoomId: chatId
      });
      message.save()
      return message
    } catch (error) {
      return error.message
    }
  }
}
