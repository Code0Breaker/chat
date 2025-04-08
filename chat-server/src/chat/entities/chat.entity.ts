import { Message } from 'src/messages/entities/message.entity';
import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  _id: string;

  @Column({ nullable: true })
  chatName: string;

  @Column({ default: false })
  isGroupChat: boolean;

  @Column({
    type: 'jsonb',
    array: false,
    nullable: true,
  })
  mutedForUserIds: string[];

  @OneToMany(() => Message, (message) => message.chat)
  messages: Message[];

  @ManyToMany(() => User, { cascade: true })
  @JoinTable()
  users: User[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
