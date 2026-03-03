import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(private jwtService: JwtService) { }

    async login(body: any) {
        // Mocking admin creds: admin / admin123
        if (body.username === 'admin' && body.password === 'admin123') {
            const payload = { username: body.username, sub: 1, role: 'admin' };
            return {
                access_token: this.jwtService.sign(payload),
            };
        }
        throw new UnauthorizedException('Invalid admin credentials');
    }
}
