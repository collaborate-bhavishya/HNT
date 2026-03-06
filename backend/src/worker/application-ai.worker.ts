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
            let aiMotivationScore = 5;
            let aiCvScore = 5; // Default if no CV or API fails

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

                    // Score CV if available
                    // @ts-ignore - Ignoring type error because Prisma schema update might be delayed in IDE
                    if (candidate.cvText) {
                        // @ts-ignore
                        const cvPrompt = `You are an HR evaluator for an EdTech company hiring teachers.
Review the following candidate CV text and rate it from 1 to 10 based on:
- Relevant teaching or tutoring experience
- Educational background (Score higher for candidates from top Indian cities and good colleges)
- Clear presentation of skills
- Look for clues regarding their teaching abilities, student engagement, and communication skills - if found, score them higher than others.

CV Text:
${candidate.cvText.substring(0, 10000)}

Reply with ONLY a single number between 1 and 10. No other text or explanation.`;

                        const cvResult = await model.generateContent(cvPrompt);
                        const cvParsed = parseFloat(cvResult.response.text().trim());
                        if (!isNaN(cvParsed)) aiCvScore = cvParsed;
                    } else {
                        // Keep dummy or 5 if no CV uploaded
                        aiCvScore = 5;
                    }
                } catch (e) {
                    this.logger.error("Gemini api failed", e);
                    throw e; // for retry mechanism
                }
            }

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
