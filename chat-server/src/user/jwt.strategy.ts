import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from './user.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // First try to extract from Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Fallback to cookies
        (req: Request) => {
          return req.cookies?.['token'];
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: 'j--wtCo-nsta-nts.sec-ret',
    });
  }

  async validate(payload: any) {
    const valid = await this.authService.verifyUser({ userId: payload._id });
    if (!valid) {
      throw new UnauthorizedException();
    }
    return valid;
  }
}
