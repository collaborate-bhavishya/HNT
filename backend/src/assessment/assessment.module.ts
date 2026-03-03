import { Module } from '@nestjs/common';
import { AssessmentController } from './assessment.controller';
import { AssessmentService } from './assessment.service';
import { PrismaService } from '../prisma.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'audio-processing-queue',
        }),
    ],
    controllers: [AssessmentController],
    providers: [AssessmentService, PrismaService],
})
export class AssessmentModule { }
