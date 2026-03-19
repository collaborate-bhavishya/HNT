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
import { QuestionsModule } from './questions/questions.module';
import { HiringManagersModule } from './hiring-managers/hiring-managers.module';
import { CandidateAuthModule } from './candidate-auth/candidate-auth.module';
import { CandidateDashboardModule } from './candidate-dashboard/candidate-dashboard.module';
import { QualityTeamModule } from './quality-team/quality-team.module';
const redisUrl = (process.env.REDIS_URL || 'redis://localhost:6379').replace(/["']/g, '');
console.log(`[AppModule] Connecting to Redis: ${redisUrl.replace(/\/\/.*@/, '//***@')}`);

const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
  retryStrategy(times) {
    if (times > 5) {
      console.error('[Redis] Max retries reached, giving up');
      return null;
    }
    return Math.min(times * 500, 3000);
  },
});

redisConnection.on('error', (err) => console.error('[Redis] Connection error:', err.message));
redisConnection.on('connect', () => console.log('[Redis] Connected successfully'));

@Module({
  imports: [
    BullModule.forRoot({
      connection: redisConnection as any,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 30000,
        },
      },
    }),
    ApplicationsModule,
    AssessmentModule,
    AdminModule,
    NotificationsModule,
    QuestionsModule,
    HiringManagersModule,
    CandidateAuthModule,
    CandidateDashboardModule,
    QualityTeamModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
