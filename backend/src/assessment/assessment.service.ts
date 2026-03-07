import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AssessmentService {
    constructor(
        private readonly prisma: PrismaService,
        @InjectQueue('audio-processing-queue') private audioQueue: Queue,
        @InjectQueue('application-ai-queue') private aiQueue: Queue,
        private notifications: NotificationsService
    ) { }

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

        // We want 20 questions: 8 easy (40%), 6 medium (30%), 6 hard (30%)
        let selectedQuestions = [
            ...shuffle(easyQuestions).slice(0, 8),
            ...shuffle(mediumQuestions).slice(0, 6),
            ...shuffle(hardQuestions).slice(0, 6),
        ];

        // If the DB doesn't have 20 questions yet, we pad with whatever is available
        if (selectedQuestions.length < 20) {
            const allAvailable = await this.prisma.question.findMany({ where: { category: topic } });
            selectedQuestions = shuffle(allAvailable).slice(0, 20);
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

    async evaluateAssessment(token: string, payload: any, file: Express.Multer.File) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { token },
        });

        if (!assessment) throw new NotFoundException('Assessment not found');
        if (assessment.status === 'COMPLETED' || assessment.status === 'AUDIO_PROCESSING') {
            throw new BadRequestException('Already submitted');
        }

        if (file && !file.mimetype.startsWith('audio/')) {
            throw new BadRequestException('Only audio files are allowed');
        }

        // Reconstruct correctAnswers map from stored mcqQuestions
        const correctAnswers: Record<string, any> = {};
        const storedQuestions = ((assessment as any).mcqQuestions as any[]) || [];

        for (const q of storedQuestions) {
            correctAnswers[q.id] = q.correctAnswer;
        }

        let mcqCorrect = 0;
        let mcqAnswers: any[] = [];
        try {
            mcqAnswers = typeof payload.mcqAnswers === 'string' ? JSON.parse(payload.mcqAnswers) : (payload.mcqAnswers || []);
        } catch { mcqAnswers = []; }

        for (const answer of mcqAnswers) {
            const correctAnswer = correctAnswers[answer.questionId];

            // Some legacy compatibility: if they were using 0-index based correctAnswer in UI
            if (typeof correctAnswer === 'number') {
                if (correctAnswer === answer.selectedOption) {
                    mcqCorrect++;
                }
            } else if (typeof correctAnswer === 'string') {
                // If options logic changed and they send back string or index, check accordingly:
                // If they send the index of selected option, we need to compare to the index or string
                // But typically options are strings. We will assume the UI sends the index in selectedOption
                // We'll map the index back to option text or assume correctly.
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

        if (mcqScore >= 60) {
            let audioDriveLink: string | null = null;
            try {
                let audioFilePath: string | null = null;
                if (file && file.buffer) {
                    const fs = require('fs');
                    const path = require('path');
                    const uploadDir = path.join(process.cwd(), 'uploads');
                    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

                    const fileName = `${assessment.id}-${Date.now()}.webm`;
                    audioFilePath = path.join(uploadDir, fileName);
                    fs.writeFileSync(audioFilePath, file.buffer);
                    audioDriveLink = 'https://mock-google-drive.com/audio/' + file.originalname;
                }

                await this.prisma.assessment.update({
                    where: { id: assessment.id },
                    data: {
                        mcqScore,
                        audioDriveLink,
                        status: 'AUDIO_PROCESSING',
                        completedAt: new Date(),
                    },
                });

                // Update candidate status too so Admin Dashboard filters work
                await this.prisma.candidate.update({
                    where: { id: assessment.candidateId },
                    data: { status: 'AUDIO_PROCESSING' }
                });

                await this.audioQueue.add('process-audio', {
                    assessmentId: assessment.id,
                    audioFilePath, // Pass path instead of base64
                    audioMimeType: file?.mimetype,
                });

                // trigger AI scoring for Motivation and CV now that MCQ passed
                await this.aiQueue.add('process-application-ai', { candidateId: assessment.candidateId });
            } catch (queueError) {
                console.error('CRITICAL ERROR IN ASSESSMENT SUBMISSION:', queueError);
                // We DON'T re-throw here because we want to return the result, 
                // but this will help us see the error in logs next time.
                throw queueError; // Actually, let's throw so the user gets the error but we see it.
            }

        } else {
            // MCQ Failed
            await this.prisma.assessment.update({
                where: { id: assessment.id },
                data: {
                    mcqScore,
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

            // Send rejection email right away
            await this.notifications.sendFormRejectionEmail(updatedCandidate.email);
        }

        return {
            status: 'ASSESSMENT_COMPLETED',
            message: 'Assessment submitted successfully'
        };
    }
}
