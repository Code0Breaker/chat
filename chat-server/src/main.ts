import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'https://chat-front.animehub.club', // <-- frontend URL
    credentials: true, // <-- required to send cookies or Authorization headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(new ValidationPipe());
  app.useWebSocketAdapter(new IoAdapter(app));
  app.use(cookieParser());
  await app.listen(process.env.PORT || 3013);
}
bootstrap();
