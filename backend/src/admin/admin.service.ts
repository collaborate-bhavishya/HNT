import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    async getAllCandidates(user: any) {
        let whereClause = {};

        if (user && user.role === 'HIRING_MANAGER' && user.managerId) {
            const manager = await this.prisma.hiringManager.findUnique({
                where: { id: user.managerId }
            });
            if (manager && manager.subject) {
                whereClause = { position: { equals: manager.subject, mode: 'insensitive' } };
            }
        }

        return this.prisma.candidate.findMany({
            where: whereClause,
            include: {
                assessments: true,
                hiringManager: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getCandidateDetails(id: string) {
        const candidate = await this.prisma.candidate.findUnique({
            where: { id },
            include: { assessments: true }
        });

        if (!candidate) {
            throw new NotFoundException('Candidate not found');
        }

        return candidate;
    }

    async getDashboardConfig(subject: string) {
        const config = await this.prisma.subjectDashboardConfig.findUnique({
            where: { subject }
        });
        if (!config) {
            return { subject, mockInterviewLink: '', trainingNodes: [] };
        }
        return config;
    }

    async saveDashboardConfig(data: any) {
        const { subject, mockInterviewLink, trainingNodes } = data;
        return this.prisma.subjectDashboardConfig.upsert({
            where: { subject },
            update: { mockInterviewLink, trainingNodes },
            create: { subject, mockInterviewLink, trainingNodes }
        });
    }
}
