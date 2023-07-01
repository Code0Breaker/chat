import { Chat } from 'src/chat/entities/chat.entity';
import { Message } from 'src/messages/entities/message.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  _id: string;

  @Column()
  fullname: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({
    default:
      'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg',
  })
  pic: string;

  @Column({ default: false, nullable: false })
  isAdmin: boolean;

  @Column({ default: false, nullable: false })
  isOnline: boolean;

  @OneToMany(() => Message, (message) => message.user)
  messages: Message[];
}
