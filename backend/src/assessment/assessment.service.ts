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

        // Return questions for the assessment
        const questions = [
            {
                id: 1,
                questionText: 'Which teaching method is most effective for visual learners?',
                options: ['Lecture-based teaching', 'Diagrams and flowcharts', 'Audio recordings', 'Group discussions'],
                correctAnswer: 1,
            },
            {
                id: 2,
                questionText: 'What is the primary goal of formative assessment?',
                options: ['To assign final grades', 'To monitor student learning and provide feedback', 'To rank students', 'To evaluate the teacher'],
                correctAnswer: 1,
            },
            {
                id: 3,
                questionText: 'Which of the following best describes differentiated instruction?',
                options: ['Teaching the same content to all students', 'Tailoring instruction to meet individual needs', 'Using only digital resources', 'Focusing only on advanced students'],
                correctAnswer: 1,
            },
            {
                id: 4,
                questionText: 'What is Bloom\'s Taxonomy primarily used for?',
                options: ['Classroom decoration', 'Classifying educational learning objectives', 'Student attendance tracking', 'Parent communication'],
                correctAnswer: 1,
            },
            {
                id: 5,
                questionText: 'Which classroom management strategy is most proactive?',
                options: ['Punishing misbehavior', 'Ignoring disruptions', 'Setting clear expectations from day one', 'Sending students to the principal'],
                correctAnswer: 2,
            },
        ];

        return {
            message: 'Token verification successful',
            candidateName: `${assessment.candidate.firstName} ${assessment.candidate.lastName}`,
            status: assessment.status,
            questions,
            duration: 30 * 60, // 30 minutes in seconds
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

        // Score MCQs against correct answers
        const correctAnswers: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 2 };
        let mcqCorrect = 0;
        let mcqAnswers: any[] = [];
        try {
            mcqAnswers = typeof payload.mcqAnswers === 'string' ? JSON.parse(payload.mcqAnswers) : (payload.mcqAnswers || []);
        } catch { mcqAnswers = []; }

        for (const answer of mcqAnswers) {
            if (correctAnswers[answer.questionId] === answer.selectedOption) {
                mcqCorrect++;
            }
        }
        const mcqScore = Math.round((mcqCorrect / Object.keys(correctAnswers).length) * 100);

        if (mcqScore >= 60) {
            await this.prisma.assessment.update({
                where: { id: assessment.id },
                data: {
                    mcqScore,
                    status: 'AUDIO_PROCESSING',
                    completedAt: new Date(),
                },
            });

            // Pass audio buffer as base64 through the queue for Azure processing
            let audioBase64: string | null = null;
            let audioMimeType: string | null = null;

            if (file && file.buffer) {
                audioBase64 = file.buffer.toString('base64');
                audioMimeType = file.mimetype;
            }

            await this.audioQueue.add('process-audio', {
                assessmentId: assessment.id,
                audioBase64,
                audioMimeType,
            });

            // trigger AI scoring for Motivation and CV now that MCQ passed
            await this.aiQueue.add('process-application-ai', { candidateId: assessment.candidateId });

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
