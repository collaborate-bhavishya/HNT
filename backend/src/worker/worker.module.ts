import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { Redis } from 'ioredis';
import { ApplicationAiWorker } from './application-ai.worker';
import { AudioWorker } from './audio.worker';
import { ReminderWorker } from './reminder.worker';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

const redisUrl = (process.env.REDIS_URL || 'redis://localhost:6379').replace(/["']/g, '');
const redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    connectTimeout: 10000,
});

@Module({
    imports: [
        BullModule.forRoot({
            connection: redisConnection as any,
        }),
        BullModule.registerQueue(
            { name: 'application-ai-queue' },
            { name: 'audio-processing-queue' },
            { name: 'assessment-reminder-queue' }
        ),
        NotificationsModule,
    ],
    providers: [ApplicationAiWorker, AudioWorker, ReminderWorker, PrismaService],
})
export class WorkerModule { }
