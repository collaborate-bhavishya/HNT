import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AssessmentService {
    constructor(
        private readonly prisma: PrismaService,
        @InjectQueue('audio-processing-queue') private audioQueue: Queue,
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

        // Simulate MCQ scoring
        const mcqScore = payload.answers ? payload.answers.length * 10 : 0;

        // Mock Google Drive Upload for audio
        const audioDriveLink = file ? 'https://mock-google-drive.com/audio/' + file.filename : null;

        await this.prisma.assessment.update({
            where: { id: assessment.id },
            data: {
                mcqScore,
                audioDriveLink,
                status: 'AUDIO_PROCESSING',
                completedAt: new Date(),
                // token: null // Could invalidate token by setting it to a random string or null, but token is required @unique so let's leave as is but check status
            },
        });

        // Add to bullmq queue
        await this.audioQueue.add('process-audio', { assessmentId: assessment.id });

        return {
            status: 'ASSESSMENT_COMPLETED',
            message: 'Assessment submitted successfully'
        };
    }
}
