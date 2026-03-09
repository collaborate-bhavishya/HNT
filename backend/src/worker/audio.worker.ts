import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma.service';

@Processor('audio-processing-queue', {
    concurrency: 1,
    maxStalledCount: 1,
    stalledInterval: 300000, // 5 minutes
    lockDuration: 300000,    // 5 minutes
    drainDelay: 60,          // Wait 60s when queue is empty to avoid aggressive polling
})
export class AudioWorker extends WorkerHost {
    private readonly logger = new Logger(AudioWorker.name);

    constructor(
        private prisma: PrismaService,
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
            // We no longer score audio using Azure Speech. 
            // Mark the assessment completed and the candidate for MANUAL_REVIEW.
            const candidate = assessment.candidate;

            const applicationScore = candidate.applicationScore || 0;
            const mcqScore = assessment.mcqScore || 0;

            const finalScore = (applicationScore * 0.5) + (mcqScore * 0.5);

            const newStatus = 'MANUAL_REVIEW';

            await this.prisma.assessment.update({
                where: { id: assessment.id },
                data: {
                    audioScore: null,
                    finalScore,
                    aiSpeechRawScores: {},
                    aiSpeechTranscript: null,
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

            this.logger.log(`Successfully moved assessment ${job.data.assessmentId} to MANUAL_REVIEW. Audio processing completed.`);

        } catch (err) {
            this.logger.error(`Error processing job ${job.id}`, err);

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
