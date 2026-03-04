import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NotificationsService } from '../notifications/notifications.service';

@Processor('application-ai-queue', {
    concurrency: 1,
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
            // Prompt Gemini using motivation
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            let prompt = 'Evaluate the candidate motivation. Reply with a score between 1 and 10, nothing else.';
            if (candidate.motivation) {
                prompt = `Evaluate the candidate motivation based on their experience. Motivation: \${candidate.motivation}. Reply with a score between 1 and 10, nothing else.`;
            }

            let aiMotivationScore = 5;

            // In a real environment with real key:
            if (process.env.GEMINI_API_KEY) {
                try {
                    const result = await model.generateContent(prompt);
                    const responsePart = result.response.text();
                    const scoreParsed = parseFloat(responsePart.trim());
                    if (!isNaN(scoreParsed)) aiMotivationScore = scoreParsed;
                } catch (e) {
                    this.logger.error("Gemini api failed", e);
                    throw e; // for retry mechanism
                }
            }

            const aiCvScore = 7; // Dummy for now

            const applicationScore = (aiMotivationScore + aiCvScore) / 2;

            // Threshold 6 for testing
            const newStatus = applicationScore >= 6 ? 'TESTING' : 'REJECTED_FORM';

            await this.prisma.candidate.update({
                where: { id: candidate.id },
                data: {
                    aiMotivationScore,
                    aiCvScore,
                    applicationScore,
                    status: newStatus
                }
            });

            if (newStatus === 'TESTING') {
                // Generate token natively, maybe in Assessment service normally, but here we can create an Assessment directly
                // Wait, creating assessment is better here since we want to send the link!
                const assessment = await this.prisma.assessment.create({
                    data: {
                        candidateId: candidate.id,
                        token: require('crypto').randomUUID(),
                        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
                        status: 'PENDING'
                    }
                });
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                const link = `${frontendUrl}/assessment/${assessment.token}`;
                await this.notifications.sendAssessmentLinkEmail(candidate.email, link);
            } else if (newStatus === 'REJECTED_FORM') {
                await this.notifications.sendFormRejectionEmail(candidate.email);
            }

            this.logger.log(`Successfully processed candidate ${job.data.candidateId}, new status: ${newStatus}`);
        } catch (err) {
            this.logger.error(`Error processing application ai job ${job.id}`, err);
            throw err;
        }
    }
}
