import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AssessmentService {
    private readonly logger = new Logger('AssessmentService');
    private s3Client: S3Client | null = null;

    constructor(
        private readonly prisma: PrismaService,
        @InjectQueue('audio-processing-queue') private audioQueue: Queue,
        @InjectQueue('application-ai-queue') private aiQueue: Queue,
        private notifications: NotificationsService
    ) {
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION) {
            this.s3Client = new S3Client({
                region: process.env.AWS_REGION,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                }
            });
        }
    }

    async verifyToken(token: string) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { token },
            include: {
                candidate: {
                    select: { firstName: true, lastName: true },
                },
            },
        });

        if (!assessment) {
            throw new NotFoundException('Invalid or expired assessment token');
        }

        if (assessment.status === 'COMPLETED') {
            throw new BadRequestException('This assessment has already been completed.');
        }

        if (new Date() > assessment.expiresAt) {
            throw new BadRequestException('This assessment link has expired.');
        }

        let questions: any[] = [];
        if ((assessment as any).mcqQuestions) {
            questions = (assessment as any).mcqQuestions as any[];
            // Remove correctAnswer from the client response to prevent cheating
            questions = questions.map(q => {
                const { correctAnswer, ...rest } = q;
                return rest;
            });
        }

        return {
            message: 'Token verification successful',
            candidateName: `${assessment.candidate.firstName} ${assessment.candidate.lastName}`,
            status: assessment.status,
            topic: (assessment as any).topic,
            questions, // might be empty if not started yet
            duration: 20 * 60, // 20 minutes in seconds
        };
    }

    async startAssessment(token: string, topic: string) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { token }
        });

        if (!assessment) throw new NotFoundException('Assessment not found');
        if (assessment.status === 'COMPLETED' || assessment.status === 'AUDIO_PROCESSING') {
            throw new BadRequestException('Already submitted');
        }

        // Fetch questions from Question model based on topic
        const easyQuestions = await this.prisma.question.findMany({ where: { category: topic, difficulty: 'easy' } });
        const mediumQuestions = await this.prisma.question.findMany({ where: { category: topic, difficulty: 'medium' } });
        const hardQuestions = await this.prisma.question.findMany({ where: { category: topic, difficulty: 'hard' } });

        // Shuffle helper
        const shuffle = (array: any[]) => array.sort(() => 0.5 - Math.random());

        // We want 15 questions: 6 easy (40%), 5 medium (33%), 4 hard (27%)
        let selectedQuestions = [
            ...shuffle(easyQuestions).slice(0, 6),
            ...shuffle(mediumQuestions).slice(0, 5),
            ...shuffle(hardQuestions).slice(0, 4),
        ];

        // If the DB doesn't have 15 questions yet, we pad with whatever is available
        if (selectedQuestions.length < 15) {
            const allAvailable = await this.prisma.question.findMany({ where: { category: topic } });
            selectedQuestions = shuffle(allAvailable).slice(0, 15);
        }

        // Fallback hardcoded if absolutely 0 questions exist in the DB (for testing before CSV is loaded)
        if (selectedQuestions.length === 0) {
            selectedQuestions = [
                {
                    id: '1',
                    category: topic,
                    questionText: `What is the primary function of ${topic}?`,
                    options: ['To compile code', 'To write logic', 'To style pages', 'To manage databases'],
                    correctAnswer: 'To write logic',
                    difficulty: 'low',
                    createdAt: new Date()
                }
            ];
        }

        // Shuffle the final selected questions
        selectedQuestions = shuffle(selectedQuestions);

        const updatedAssessment = await this.prisma.assessment.update({
            where: { token },
            data: {
                topic,
                mcqQuestions: selectedQuestions as any[],
                startedAt: new Date(),
                status: 'IN_PROGRESS'
            } as any
        });

        const clientQuestions = selectedQuestions.map(q => {
            const { correctAnswer, ...rest } = q;
            return rest;
        });

        return {
            message: 'Assessment started',
            questions: clientQuestions,
            duration: 20 * 60,
        };
    }

    private async uploadAudioFile(file: Express.Multer.File, prefix: string, assessmentId: string): Promise<{ link: string; localPath: string | null }> {
        const fileName = `${prefix}-${assessmentId}-${Date.now()}.webm`;
        let link: string | null = null;
        let localPath: string | null = null;

        if (this.s3Client && process.env.AWS_S3_BUCKET_NAME) {
            const command = new PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: `audio/${fileName}`,
                Body: file.buffer,
                ContentType: file.mimetype,
            });
            await this.s3Client.send(command);
            link = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/audio/${fileName}`;
            this.logger.log(`${prefix} audio saved to S3: ${link}`);
        } else {
            const uploadDir = path.join(process.cwd(), 'uploads', 'audio');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            localPath = path.join(uploadDir, fileName);
            fs.writeFileSync(localPath, file.buffer);
            const serverUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            link = `${serverUrl}/uploads/audio/${fileName}`;
            this.logger.log(`${prefix} audio saved to local disk: ${localPath}`);
        }

        return { link: link!, localPath };
    }

    async evaluateAssessment(token: string, payload: any, teachingFile: Express.Multer.File, introFile?: Express.Multer.File) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { token },
        });

        if (!assessment) throw new NotFoundException('Assessment not found');
        if (assessment.status === 'COMPLETED' || assessment.status === 'AUDIO_PROCESSING') {
            throw new BadRequestException('Already submitted');
        }

        for (const f of [teachingFile, introFile].filter(Boolean) as Express.Multer.File[]) {
            if (!f.mimetype.startsWith('audio/') && !f.mimetype.includes('octet-stream')) {
                throw new BadRequestException('Only audio files are allowed');
            }
        }

        const correctAnswers: Record<string, any> = {};
        const storedQuestions = ((assessment as any).mcqQuestions as any[]) || [];

        for (const q of storedQuestions) {
            correctAnswers[q.id] = q.correctAnswer;
        }

        let mcqCorrect = 0;
        let mcqAnswers: any[] = [];
        try {
            if (typeof payload.mcqAnswers === 'string') {
                mcqAnswers = JSON.parse(payload.mcqAnswers);
            } else if (Array.isArray(payload.mcqAnswers)) {
                mcqAnswers = payload.mcqAnswers;
            } else {
                mcqAnswers = [];
            }
        } catch (e) {
            this.logger.error('Failed to parse mcqAnswers', e);
            mcqAnswers = [];
        }

        if (Array.isArray(mcqAnswers)) {
            for (const answer of mcqAnswers) {
                const correctAnswer = correctAnswers[answer.questionId];

                if (typeof correctAnswer === 'number') {
                    if (correctAnswer === answer.selectedOption) {
                        mcqCorrect++;
                    }
                } else if (typeof correctAnswer === 'string') {
                    const questionObj = storedQuestions.find(sq => sq.id === answer.questionId);
                    const options = questionObj?.options as string[];
                    if (options && options[answer.selectedOption] === correctAnswer) {
                        mcqCorrect++;
                    }
                }
            }

            let mcqScore = 0;
            if (storedQuestions.length > 0) {
                mcqScore = Math.round((mcqCorrect / storedQuestions.length) * 100);
            }

            // Always upload audio files regardless of MCQ score
            let audioDriveLink: string | null = null;
            let introAudioDriveLink: string | null = null;
            let audioFilePath: string | null = null;

            try {
                if (teachingFile?.buffer) {
                    const result = await this.uploadAudioFile(teachingFile, 'teaching', assessment.id);
                    audioDriveLink = result.link;
                    audioFilePath = result.localPath;
                }

                if (introFile?.buffer) {
                    const result = await this.uploadAudioFile(introFile, 'intro', assessment.id);
                    introAudioDriveLink = result.link;
                }
            } catch (uploadErr) {
                this.logger.error('Error uploading audio files:', uploadErr);
            }

            if (mcqScore >= 60) {
                try {
                    await this.prisma.assessment.update({
                        where: { id: assessment.id },
                        data: {
                            mcqScore,
                            audioDriveLink,
                            introAudioDriveLink,
                            status: 'AUDIO_PROCESSING',
                            completedAt: new Date(),
                        },
                    });

                    await this.prisma.candidate.update({
                        where: { id: assessment.candidateId },
                        data: { status: 'AUDIO_PROCESSING' }
                    });

                    await this.audioQueue.add('process-audio', {
                        assessmentId: assessment.id,
                        audioFilePath,
                        audioMimeType: teachingFile?.mimetype,
                    });

                    await this.aiQueue.add('process-application-ai', { candidateId: assessment.candidateId });
                } catch (queueError) {
                    console.error('CRITICAL ERROR IN ASSESSMENT SUBMISSION:', queueError);
                    throw queueError;
                }

            } else {
                await this.prisma.assessment.update({
                    where: { id: assessment.id },
                    data: {
                        mcqScore,
                        audioDriveLink,
                        introAudioDriveLink,
                        status: 'COMPLETED',
                        completedAt: new Date(),
                    },
                });

                const updatedCandidate = await this.prisma.candidate.update({
                    where: { id: assessment.candidateId },
                    data: {
                        status: 'REJECTED_FINAL',
                        rejectionReason: 'MCQ Failed - Score below threshold (60%)'
                    }
                });

                await this.notifications.sendFormRejectionEmail(updatedCandidate.email);
            }

            return {
                status: 'ASSESSMENT_COMPLETED',
                message: 'Assessment submitted successfully'
            };
        }
    }
}
