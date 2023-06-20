import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { ChatModule } from './chat/chat.module';
import { MessagesModule } from './messages/messages.module';
import { SocketsModule } from './sockets/sockets.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'db.shield-platform.com',
      port: 5432,
      username: 'overlord',
      password: 'Overlord_9600',
      database: 'chat',
      entities: ['dist/**/*.entity{.ts,.js}'],
      synchronize: true,
      // ssl:{rejectUnauthorized:false}
    }),
    UserModule,
    ChatModule,
    MessagesModule,
    SocketsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
