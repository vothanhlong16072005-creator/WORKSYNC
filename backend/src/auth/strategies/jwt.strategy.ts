import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super_secret_key',
    });
  }

  async validate(payload: { sub: string; email: string; role: string; departmentId?: string | null }) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      departmentId: payload.departmentId ?? null,
    };
  }
}
