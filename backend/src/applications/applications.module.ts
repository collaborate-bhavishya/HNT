import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ApplicationEvaluatorService } from './application-evaluator.service';
import { PrismaService } from '../prisma.service';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'application-ai-queue',
        }),
        NotificationsModule
    ],
    controllers: [ApplicationsController],
    providers: [ApplicationsService, ApplicationEvaluatorService, PrismaService],
})
export class ApplicationsModule { }
