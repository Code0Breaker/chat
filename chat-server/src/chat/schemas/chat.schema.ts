import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Messages } from './messages.schema';

export type ChatDocument = Chat & Document;

@Schema({ timestamps: true, versionKey: false })
export class Chat {
  @Prop({ type: String, trim: true })
  chatName: string;
  @Prop({ type: Boolean, default: false })
  isGroupChat: boolean;
  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }] })
  users: User[];
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'message',
  })
  latestMessage: Messages;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'user' })
  groupAdmin: User;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
