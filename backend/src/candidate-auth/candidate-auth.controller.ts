import { Controller, Post, Body } from '@nestjs/common';
import { CandidateAuthService } from './candidate-auth.service';

@Controller('api/candidate-auth')
export class CandidateAuthController {
  constructor(private readonly candidateAuthService: CandidateAuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; pin: string }) {
    return this.candidateAuthService.login(body.email, body.pin);
  }
}
