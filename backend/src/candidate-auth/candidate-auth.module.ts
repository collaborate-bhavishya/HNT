import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CandidateAuthController } from './candidate-auth.controller';
import { CandidateAuthService } from './candidate-auth.service';
import { JwtCandidateStrategy } from './jwt-candidate.strategy';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [CandidateAuthController],
  providers: [CandidateAuthService, JwtCandidateStrategy, PrismaService],
  exports: [CandidateAuthService],
})
export class CandidateAuthModule {}
