import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NotificationsService } from '../notifications/notifications.service';

@Processor('application-ai-queue', {
    concurrency: 1,
    maxStalledCount: 1,
    stalledInterval: 300000, // 5 minutes (saves metadata checks)
    lockDuration: 300000,    // 5 minutes (saves lock renewal calls)
    drainDelay: 60,          // 60 seconds (saves polling calls when queue is empty)
})
export class ApplicationAiWorker extends WorkerHost {
    private readonly logger = new Logger(ApplicationAiWorker.name);
    private genAI: GoogleGenerativeAI;

    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService
    ) {
        super();
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'fake-key');
    }

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log(`Processing application ai job ${job.id} for candidate ${job.data.candidateId}`);

        const candidate = await this.prisma.candidate.findUnique({
            where: { id: job.data.candidateId }
        });

        if (!candidate || candidate.status !== 'AI_SCORING') {
            this.logger.warn(`Candidate ${job.data.candidateId} not found or not in AI_SCORING status`);
            return;
        }

        try {
            let aiMotivationScore = 5;
            let aiCvScore = null; // Removed CV AI scoring

            // In a real environment with real key:
            if (process.env.GEMINI_API_KEY) {
                try {
                    // Score Motivation
                    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                    let motivationPrompt = 'Evaluate the candidate intent to work the company based on the answer written by him/her. Reply with a score between 1 and 10, nothing else.';
                    if (candidate.motivation) {
                        motivationPrompt = `Evaluate the candidate intent to work the company based on the answer written by him/her: "${candidate.motivation}". Reply with a score between 1 and 10, nothing else.`;
                    }

                    const mResult = await model.generateContent(motivationPrompt);
                    const mParsed = parseFloat(mResult.response.text().trim());
                    if (!isNaN(mParsed)) aiMotivationScore = mParsed;
                } catch (e) {
                    this.logger.error("Gemini api failed", e);
                    throw e; // for retry mechanism
                }
            }

            const applicationScore = aiMotivationScore;

            await this.prisma.candidate.update({
                where: { id: candidate.id },
                data: {
                    aiMotivationScore,
                    aiCvScore,
                    applicationScore
                }
            });

            this.logger.log(`Successfully processed candidate ${job.data.candidateId} AI Application scores`);
        } catch (err) {
            this.logger.error(`Error processing application ai job ${job.id}`, err);
            throw err;
        }
    }
}
