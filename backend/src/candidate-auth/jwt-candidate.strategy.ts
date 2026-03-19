import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtCandidateStrategy extends PassportStrategy(Strategy, 'jwt-candidate') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key',
    });
  }

  async validate(payload: any) {
    if (payload.role !== 'candidate') {
      throw new UnauthorizedException('Candidate access required');
    }
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
