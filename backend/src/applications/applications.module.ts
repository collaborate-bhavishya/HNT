import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ApplicationEvaluatorService } from './application-evaluator.service';
import { PrismaService } from '../prisma.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'application-ai-queue',
        }),
    ],
    controllers: [ApplicationsController],
    providers: [ApplicationsService, ApplicationEvaluatorService, PrismaService],
})
export class ApplicationsModule { }
