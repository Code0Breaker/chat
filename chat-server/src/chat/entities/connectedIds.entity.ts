import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ConnectedIds{
    @PrimaryGeneratedColumn()
    id:number;
    @Column()
    userId:string
    @Column()
    chatId:string
}