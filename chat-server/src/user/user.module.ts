import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: 'j--wtCo-nsta-nts.sec-ret',
      signOptions: { expiresIn: '60m' },
    }),
  ],
  controllers: [UserController],
  providers: [UserService, JwtStrategy],
  exports: [UserService, JwtModule], // 👈 export JwtModule to make JwtService available
})
export class UserModule {}
