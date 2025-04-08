import { CanActivate, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserService } from '../user.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WsGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  canActivate(
    context: any,
  ): boolean | any | Promise<boolean | any> | Observable<boolean | any> {
    const bearerToken =
      context.args[0].handshake.headers.authorization?.split(' ')[1];
    try {
      console.log(bearerToken);

      const decoded = this.jwtService.verify(bearerToken, {
        secret: 'j--wtCo-nsta-nts.sec-ret',
      }) as any;
      console.log(decoded);

      // return new Promise((resolve, reject) => {
      //     return this.userService.verifyUser({ userId: decoded._id }).then(user => {
      //         if (user) {
      //             context.switchToWs().getClient().user = decoded._id;
      //             resolve(user);
      //         } else {
      //             reject(false);
      //         }
      //     });

      // });
      return false;
    } catch (ex) {
      console.log(ex);
      return false;
    }
  }
}
