import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: unknown, user: TUser, info: unknown): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('You must be logged in');
    }
    return user;
  }
}
