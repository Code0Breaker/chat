import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { LoginDto } from './dto/login-dto';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Like, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UserService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async register(body) {
    try {
      const saltOrRounds = 10;
      const hash = await bcrypt.hash(body.password, saltOrRounds);
      const newUser = await this.userRepo.save({ ...body, password: hash });

      // return newUser
      return new HttpException(
        {
          status: HttpStatus.CREATED,
          success: `${newUser.fullname} successfully registered`,
        },
        HttpStatus.CREATED,
      );
    } catch (err) {
      throw err;
    }
  }

  async login(data: LoginDto) {
    const user = await this.userRepo.findOneBy({ email: data.email });
    try {
      if (user) {
        const isMatch = await bcrypt.compare(data.password, user.password);
        if (isMatch) {
          await this.userRepo.update({_id:user._id},{isOnline:true})
          return {
            token: this.jwtService.sign({
              _id: user._id,
              fullname: user.fullname,
            }),
            fullname: user.fullname,
            _id: user._id,
            pic: user.pic,
          };
        } else {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              error: 'Invalid password',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      } else {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'User not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }
    } catch (err) {
      throw err;
    }
  }

  async verifyUser(user) {
    const verified = await this.userRepo.findOne(user);
    return {
      refresh_token: this.jwtService.sign({
        _id: verified._id,
        fullname: verified.fullname,
      }),
      _id: verified._id,
    };
  }
}
