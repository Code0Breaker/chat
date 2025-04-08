import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from './user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: 'j--wtCo-nsta-nts.sec-ret',
    });
  }

  async validate(payload: any) {
    console.log(payload);
    
    const valid = await this.authService.verifyUser({ userId: payload._id });
    if (!valid) {
      throw new UnauthorizedException();
    }
    return valid;
  }
}
