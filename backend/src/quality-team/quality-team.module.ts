import { Module } from '@nestjs/common';
import { QualityTeamService } from './quality-team.service';
import { QualityTeamController } from './quality-team.controller';
import { PrismaService } from '../prisma.service';

@Module({
    providers: [QualityTeamService, PrismaService],
    controllers: [QualityTeamController],
    exports: [QualityTeamService],
})
export class QualityTeamModule {}
