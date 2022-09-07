import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Chat } from './chat.schema';

export type MessagesDocument = Messages & Document;

@Schema({ timestamps: true, versionKey: false })
export class Messages {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'user' })
  sender: User;
  // @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "user" })
  // reciver:User
  @Prop({ type: String, trim: true })
  content: string;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'chat' })
  chatRoomId: Chat;
  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }] })
  readBy: User[];
}

export const MessagesSchema = SchemaFactory.createForClass(Messages);
