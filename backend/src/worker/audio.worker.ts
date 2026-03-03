import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Processor('audio-processing-queue', {
    concurrency: 1,
})
export class AudioWorker extends WorkerHost {
    private readonly logger = new Logger(AudioWorker.name);

    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log(`Processing audio job ${job.id} for assessment ${job.data.assessmentId}`);

        const assessment = await this.prisma.assessment.findUnique({
            where: { id: job.data.assessmentId },
            include: { candidate: true }
        });

        if (!assessment || assessment.status !== 'AUDIO_PROCESSING') {
            this.logger.warn(`Assessment ${job.data.assessmentId} not found or not in AUDIO_PROCESSING status`);
            return;
        }

        try {
            // Call Azure pronunciation API
            // Since we mock it:
            const accuracy = Math.random() * 100;
            const fluency = Math.random() * 100;
            const pronunciation = Math.random() * 100;
            const completeness = Math.random() * 100;

            const audioScore = (accuracy * 0.4) + (fluency * 0.3) + (pronunciation * 0.2) + (completeness * 0.1);

            const rawScores = { accuracy, fluency, pronunciation, completeness };
            const transcript = "this is a mock transcript from azure";

            const candidate = assessment.candidate;
            const applicationScore = candidate.applicationScore || 0;
            const mcqScore = assessment.mcqScore || 0;

            const finalScore = (applicationScore * 0.3) + (mcqScore * 0.4) + (audioScore * 0.3);

            let newStatus = 'REJECTED_FINAL';
            if (finalScore >= 75) newStatus = 'SELECTED';
            else if (finalScore >= 60) newStatus = 'MANUAL_REVIEW';

            await this.prisma.assessment.update({
                where: { id: assessment.id },
                data: {
                    audioScore,
                    finalScore,
                    aiSpeechRawScores: rawScores,
                    aiSpeechTranscript: transcript,
                    status: 'COMPLETED'
                }
            });

            await this.prisma.candidate.update({
                where: { id: assessment.candidateId },
                data: {
                    status: newStatus,
                    finalScore
                }
            });

            await this.notifications.sendFinalDecisionEmail(candidate.email, newStatus);

            this.logger.log(`Successfully processed audio and final evaluation for assessment ${job.data.assessmentId}, Final Score: ${finalScore}, Status: ${newStatus}`);
        } catch (err) {
            this.logger.error(`Error processing job ${job.id}`, err);

            // on complete failure mark as audio failed if attempts exceed our limit
            // we assume 3 attempts as retries
            if (job.attemptsMade >= 2) {
                await this.prisma.candidate.update({
                    where: { id: assessment.candidateId },
                    data: { status: 'AUDIO_FAILED' }
                });
            }
            throw err;
        }
    }
}
