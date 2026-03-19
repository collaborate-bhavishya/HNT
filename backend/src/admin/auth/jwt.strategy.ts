import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'super-secret-key',
        });
    }

    async validate(payload: any) {
        const validRoles = ['admin', 'MASTER_ADMIN', 'HIRING_MANAGER', 'QUALITY_TEAM'];
        if (!validRoles.includes(payload.role)) {
            throw new UnauthorizedException('Admin access required');
        }
        return { userId: payload.sub, username: payload.username, role: payload.role, email: payload.email, managerId: payload.managerId, qualityId: payload.qualityId };
    }
}
