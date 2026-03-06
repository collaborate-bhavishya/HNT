import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { ApplicationEvaluatorService } from './application-evaluator.service';
import { CreateApplicationDto } from './create-application.dto';
import { NotificationsService } from '../notifications/notifications.service';
const pdfParse = require('pdf-parse');

@Injectable()
export class ApplicationsService {
    constructor(
        private prisma: PrismaService,
        private evaluatorService: ApplicationEvaluatorService,
        private notifications: NotificationsService,
        @InjectQueue('application-ai-queue') private aiQueue: Queue,
    ) { }

    async submitApplication(dto: CreateApplicationDto, file?: Express.Multer.File) {
        if (file && file.mimetype !== 'application/pdf') {
            throw new BadRequestException('Only PDF files are allowed');
        }

        if (file && file.size > 5 * 1024 * 1024) {
            throw new BadRequestException('File size must be less than 5MB');
        }

        // Check duplicate
        const existing = await this.prisma.candidate.findFirst({
            where: {
                OR: [{ email: dto.email }, { phone: dto.phone }],
            },
        });

        if (existing) {
            throw new BadRequestException('Candidate with this email or phone already applied');
        }

        // Parse boolean fields (multipart form-data sends strings)
        const toBool = (v: any): boolean | undefined => {
            if (v === undefined || v === null) return undefined;
            if (v === true || v === 'true') return true;
            if (v === false || v === 'false') return false;
            return undefined;
        };

        // Evaluate
        const evalResult = this.evaluatorService.evaluate({
            position: dto.position,
            experience: Number(dto.experience),
            expectedSalary: dto.expectedSalary ? Number(dto.expectedSalary) : undefined,
            available120Hours: toBool(dto.available120Hours),
            openToWeekends: toBool(dto.openToWeekends),
            comfortableNightShifts: toBool(dto.comfortableNightShifts),
            motivation: dto.motivation,
        });

        // Mock Google Drive Upload
        const cvDriveLink = file ? 'https://mock-google-drive.com/file/' + file.filename : null;

        let cvText: string | null = null;
        if (file && file.buffer) {
            try {
                const pdfData = await pdfParse(file.buffer);
                cvText = pdfData.text;
                if (cvText && cvText.length > 20000) cvText = cvText.substring(0, 20000);
            } catch (err) {
                console.error('Error parsing PDF:', err);
            }
        }

        let status = 'APPLIED';
        if (!evalResult.passed) {
            status = 'REJECTED_FORM';
        } else {
            status = 'TESTING';
        }

        const candidate = await this.prisma.candidate.create({
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                email: dto.email,
                phone: dto.phone,
                position: dto.position,
                experience: Number(dto.experience),
                expectedSalary: dto.expectedSalary ? Number(dto.expectedSalary) : null,
                currentLocation: dto.currentLocation,
                motivation: dto.motivation,
                cvDriveLink,
                cvText,
                status,
                layer1Score: evalResult.score,
                rejectionReason: evalResult.rejectionReason,
            },
        });

        if (status === 'TESTING') {
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
        } else if (status === 'REJECTED_FORM') {
            await this.notifications.sendFormRejectionEmail(candidate.email);
        }

        return {
            message: 'Application submitted successfully',
            candidateId: candidate.id,
            status: candidate.status,
        };
    }

    async getAllCandidates() {
        return this.prisma.candidate.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async getCandidateById(id: string) {
        return this.prisma.candidate.findUnique({
            where: { id },
            include: {
                assessments: {
                    select: {
                        id: true,
                        status: true,
                        mcqScore: true,
                        audioScore: true,
                        finalScore: true,
                        aiSpeechRawScores: true,
                        aiSpeechTranscript: true,
                        completedAt: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }
}
