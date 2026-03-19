import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class CandidateAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, pin: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { email },
    });

    if (!candidate) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!candidate.pin || candidate.pin !== pin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: candidate.id, email: candidate.email, role: 'candidate' };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
