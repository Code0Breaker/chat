import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Chat } from 'src/chat/schemas/chat.schema';
export type UserDocument = User & Document;

@Schema({ timestamps: true, versionKey: false })
export class User {
  @Prop({ type: String, required: true })
  fullname: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({
    type: String,
    required: true,
    default:
      'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg',
  })
  pic: string;

  @Prop({
    type: Boolean,
    required: true,
    default: false,
  })
  isAdmin: boolean;

  @Prop({ type: String })
  socketId: string;
  // @Prop({type:[{ type: mongoose.Schema.Types.ObjectId, ref: "chat" }]})
  // chats:Chat[]
}

export const UserSchema = SchemaFactory.createForClass(User);
