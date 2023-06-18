import { Module } from '@nestjs/common';
import { SocketsService } from './sockets.service';
import { ChatGateway } from './sockets.gateway';


@Module({
  providers: [ChatGateway, SocketsService],
})
export class SocketsModule {}
