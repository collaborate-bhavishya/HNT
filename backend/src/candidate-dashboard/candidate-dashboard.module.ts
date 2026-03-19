import { Module } from '@nestjs/common';
import { CandidateDashboardController } from './candidate-dashboard.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CandidateDashboardController],
  providers: [PrismaService],
})
export class CandidateDashboardModule {}
