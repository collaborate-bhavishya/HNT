import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ApplicationAiWorker } from './application-ai.worker';
import { AudioWorker } from './audio.worker';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        BullModule.forRoot({
            connection: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
            },
        }),
        NotificationsModule,
    ],
    providers: [ApplicationAiWorker, AudioWorker, PrismaService],
})
export class WorkerModule { }
