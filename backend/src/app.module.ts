import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApplicationsModule } from './applications/applications.module';
import { AssessmentModule } from './assessment/assessment.module';
import { PrismaService } from './prisma.service';
import { BullModule } from '@nestjs/bullmq';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WorkerModule } from './worker/worker.module';
import { QuestionsModule } from './questions/questions.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: new Redis((process.env.REDIS_URL || 'redis://localhost:6379').replace(/["']/g, ''), {
        maxRetriesPerRequest: null,
      }) as any,
    }),
    ApplicationsModule,
    AssessmentModule,
    AdminModule,
    NotificationsModule,
    WorkerModule,
    QuestionsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
