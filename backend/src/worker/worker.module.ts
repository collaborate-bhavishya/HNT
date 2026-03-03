import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { Redis } from 'ioredis';
import { ApplicationAiWorker } from './application-ai.worker';
import { AudioWorker } from './audio.worker';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        BullModule.forRoot({
            connection: new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
                maxRetriesPerRequest: null,
            }) as any,
        }),
        NotificationsModule,
    ],
    providers: [ApplicationAiWorker, AudioWorker, PrismaService],
})
export class WorkerModule { }
