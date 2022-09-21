import { Chat } from "src/chat/entities/chat.entity";
import { User } from "src/user/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Message {
    @PrimaryGeneratedColumn('uuid')
    _id:string

    @Column()
    content:string

    @ManyToOne(() => User, user => user.messages)
    @JoinColumn()
    user: User;

    @ManyToOne(() => Chat, chat => chat.messages)
    @JoinTable()
    chat: Chat;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
