import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    async getAllCandidates() {
        return this.prisma.candidate.findMany({
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
}
