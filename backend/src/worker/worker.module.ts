import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { Redis } from 'ioredis';
import { ApplicationAiWorker } from './application-ai.worker';
import { AudioWorker } from './audio.worker';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        BullModule.registerQueue(
            { name: 'application-ai-queue' },
            { name: 'audio-processing-queue' }
        ),
        NotificationsModule,
    ],
    providers: [ApplicationAiWorker, AudioWorker, PrismaService],
})
export class WorkerModule { }
