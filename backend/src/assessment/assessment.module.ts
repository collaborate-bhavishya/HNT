import { Module } from '@nestjs/common';
import { AssessmentController } from './assessment.controller';
import { AssessmentService } from './assessment.service';
import { PrismaService } from '../prisma.service';
import { BullModule } from '@nestjs/bullmq';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'audio-processing-queue',
        }),
        BullModule.registerQueue({
            name: 'application-ai-queue',
        }),
        NotificationsModule,
    ],
    controllers: [AssessmentController],
    providers: [AssessmentService, PrismaService],
})
export class AssessmentModule { }
