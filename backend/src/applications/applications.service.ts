import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { ApplicationEvaluatorService } from './application-evaluator.service';
import { CreateApplicationDto } from './create-application.dto';
import { NotificationsService } from '../notifications/notifications.service';

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

        // Evaluate
        const evalResult = this.evaluatorService.evaluate({
            position: dto.position,
            experience: Number(dto.experience),
            expectedSalary: dto.expectedSalary ? Number(dto.expectedSalary) : undefined,
        });

        // Mock Google Drive Upload
        const cvDriveLink = file ? 'https://mock-google-drive.com/file/' + file.filename : null;

        let status = 'APPLIED';
        if (!evalResult.passed) {
            status = 'REJECTED';
        } else {
            status = 'AI_SCORING';
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
                status,
                layer1Score: evalResult.score,
                rejectionReason: evalResult.rejectionReason,
            },
        });

        if (status === 'AI_SCORING') {
            await this.aiQueue.add('process-application-ai', { candidateId: candidate.id });
        } else if (status === 'REJECTED') {
            this.notifications.sendFormRejectionEmail(candidate.email).catch(err => {
                console.error('Failed to send instant rejection email:', err);
            });
        }

        return {
            message: 'Application submitted successfully',
            candidateId: candidate.id,
            status: candidate.status,
        };
    }

    async getAllCandidates() {
        return this.prisma.candidate.findMany();
    }
}
