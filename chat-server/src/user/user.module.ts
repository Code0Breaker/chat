import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { Chat, ChatSchema } from 'src/chat/schemas/chat.schema';
import { Messages, MessagesSchema } from 'src/chat/schemas/messages.schema';

@Module({
  imports: [
    JwtModule.register({
      secret: 'j--wtCo-nsta-nts.sec-ret',
      signOptions: { expiresIn: '60m' },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Chat.name, schema: ChatSchema },
      { name: Messages.name, schema: MessagesSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, JwtStrategy],
})
export class UserModule {}
