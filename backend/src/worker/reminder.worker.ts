import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Processor('assessment-reminder-queue')
export class ReminderWorker extends WorkerHost {
    private readonly logger = new Logger(ReminderWorker.name);

    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService,
    ) {
        super();
    }

    async process(job: Job<{ candidateId: string; assessmentToken: string }>) {
        const { candidateId, assessmentToken } = job.data;
        this.logger.log(`Processing auto-reminder for candidate ${candidateId}`);

        try {
            const candidate = await this.prisma.candidate.findUnique({
                where: { id: candidateId },
                include: {
                    assessments: {
                        where: { token: assessmentToken },
                        take: 1,
                    },
                },
            });

            if (!candidate) {
                this.logger.warn(`Candidate ${candidateId} not found, skipping reminder`);
                return;
            }

            // Only send if candidate is still in TESTING phase
            if (candidate.status !== 'TESTING') {
                this.logger.log(`Candidate ${candidateId} is no longer in TESTING (status: ${candidate.status}), skipping`);
                return;
            }

            const assessment = candidate.assessments[0];
            if (!assessment) {
                this.logger.warn(`No assessment found for candidate ${candidateId}, skipping`);
                return;
            }

            // Only send if assessment is not yet completed
            if (assessment.completedAt) {
                this.logger.log(`Assessment already completed for candidate ${candidateId}, skipping`);
                return;
            }

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const link = `${frontendUrl}/assessment/${assessmentToken}`;

            await this.notifications.sendAssessmentReminderEmail(candidate.id, candidate.email, link);

            // Update reminder count
            await this.prisma.assessment.update({
                where: { id: assessment.id },
                data: {
                    reminderCount: { increment: 1 },
                    lastReminderAt: new Date(),
                },
            });

            this.logger.log(`Auto-reminder sent to candidate ${candidateId} at ${candidate.email}`);
        } catch (error) {
            this.logger.error(`Failed to send auto-reminder for candidate ${candidateId}`, error);
            throw error;
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, error: Error) {
        this.logger.error(`Reminder job ${job.id} failed: ${error.message}`);
    }
}
