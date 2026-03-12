import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { ApplicationEvaluatorService } from './application-evaluator.service';
import { CreateApplicationDto } from './create-application.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ApplicationsService {
    private s3Client: S3Client | null = null;

    constructor(
        private prisma: PrismaService,
        private evaluatorService: ApplicationEvaluatorService,
        private notifications: NotificationsService,
        @InjectQueue('application-ai-queue') private aiQueue: Queue,
    ) {
        const hasKeys = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION);
        console.log(`[ApplicationsService] AWS Keys found: ${hasKeys} (Region: ${process.env.AWS_REGION})`);

        if (hasKeys) {
            this.s3Client = new S3Client({
                region: process.env.AWS_REGION!,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
                }
            });
        }
    }

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

        // File Storage for CV (Primary: S3, Fallback: Local)
        let cvDriveLink: string | null = null;
        let cvText: string | null = null;

        if (file && file.buffer) {
            const fileName = `cv-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

            if (this.s3Client && process.env.AWS_S3_BUCKET_NAME) {
                // Upload to AWS S3
                try {
                    const command = new PutObjectCommand({
                        Bucket: process.env.AWS_S3_BUCKET_NAME,
                        Key: `cvs/${fileName}`,
                        Body: file.buffer,
                        ContentType: file.mimetype,
                        // ACL: 'public-read' // Uncomment if you want objects publicly readable by default, but it's often better to configure the bucket policy instead
                    });

                    await this.s3Client.send(command);

                    // Construct public S3 URL
                    cvDriveLink = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/cvs/${fileName}`;
                } catch (err) {
                    console.error('Error uploading PDF to S3:', err);
                }
            } else {
                // Fallback to local storage (e.g. for local dev without AWS keys)
                try {
                    const uploadDir = path.join(process.cwd(), 'uploads', 'cvs');
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }

                    const filePath = path.join(uploadDir, fileName);
                    fs.writeFileSync(filePath, file.buffer);

                    const serverUrl = process.env.BACKEND_URL || 'http://localhost:3000';
                    cvDriveLink = `${serverUrl}/uploads/cvs/${fileName}`;
                } catch (err) {
                    console.error('Error saving PDF locally:', err);
                }
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

        let assessmentToken: string | null = null;
        if (status === 'TESTING') {
            const assessment = await this.prisma.assessment.create({
                data: {
                    candidateId: candidate.id,
                    token: require('crypto').randomUUID(),
                    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
                    status: 'PENDING'
                }
            });
            assessmentToken = assessment.token;
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const link = `${frontendUrl}/assessment/${assessmentToken}`;
            await this.notifications.sendAssessmentLinkEmail(candidate.email, link);
        } else if (status === 'REJECTED_FORM') {
            await this.notifications.sendFormRejectionEmail(candidate.email);
        }

        return {
            message: 'Application submitted successfully',
            candidateId: candidate.id,
            status: candidate.status,
            assessmentToken
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
                        token: true,
                        status: true,
                        topic: true,
                        mcqScore: true,
                        mcqQuestions: true,
                        audioScore: true,
                        finalScore: true,
                        aiSpeechRawScores: true,
                        aiSpeechTranscript: true,
                        startedAt: true,
                        completedAt: true,
                        expiresAt: true,
                        createdAt: true,
                        introAudioDriveLink: true,
                        audioDriveLink: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }

    async sendAssessmentReminder(candidateId: string) {
        const candidate = await this.prisma.candidate.findUnique({
            where: { id: candidateId },
            include: { assessments: { orderBy: { createdAt: 'desc' }, take: 1 } },
        });

        if (!candidate) throw new Error('Candidate not found');
        if (candidate.status !== 'TESTING') throw new Error('Candidate is not in testing phase');

        const assessment = candidate.assessments[0];
        if (!assessment) throw new Error('No assessment found');

        if (new Date() > assessment.expiresAt) {
            // Extend expiry by another 72 hours and reset
            await this.prisma.assessment.update({
                where: { id: assessment.id },
                data: { expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
            });
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const link = `${frontendUrl}/assessment/${assessment.token}`;
        await this.notifications.sendAssessmentReminderEmail(candidate.email, link);

        return { message: 'Reminder sent successfully' };
    }

    async updateCandidateStatus(id: string, status: string) {
        const candidate = await this.prisma.candidate.update({
            where: { id },
            data: { status }
        });

        if (status === 'SELECTED' || status === 'REJECTED_FINAL') {
            await this.notifications.sendFinalDecisionEmail(candidate.email, status);
        }

        return candidate;
    }
}
