import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class QualityTeamService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: { name: string; email: string; pin: string; subject?: string; isAutoAssignEnabled?: boolean }) {
        const existing = await this.prisma.qualityTeam.findUnique({ where: { email: data.email } });
        if (existing) throw new BadRequestException('A quality team member with this email already exists');

        // Pin must be 4 digits
        if (!/^\d{4}$/.test(data.pin)) {
            throw new BadRequestException('PIN must be exactly 4 digits');
        }

        const hashedPin = await bcrypt.hash(data.pin, 10);
        return this.prisma.qualityTeam.create({
            data: {
                name: data.name,
                email: data.email,
                pin: hashedPin,
                subject: data.subject || 'Coding',
                isAutoAssignEnabled: data.isAutoAssignEnabled ?? false,
            },
            select: { id: true, name: true, email: true, subject: true, isActive: true, isAutoAssignEnabled: true, createdAt: true },
        });
    }

    async findAll() {
        return this.prisma.qualityTeam.findMany({
            select: {
                id: true, name: true, email: true, subject: true, isActive: true, isAutoAssignEnabled: true, createdAt: true,
                _count: { select: { candidates: true } },
            },
            orderBy: { createdAt: 'desc' },
        }).then(members => members.map(m => ({ ...m, candidateCount: m._count.candidates, _count: undefined })));
    }

    async findActive() {
        return this.prisma.qualityTeam.findMany({
            where: { isActive: true },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' },
        });
    }

    async update(id: string, data: { name?: string; email?: string; pin?: string; subject?: string; isActive?: boolean; isAutoAssignEnabled?: boolean }) {
        const member = await this.prisma.qualityTeam.findUnique({ where: { id } });
        if (!member) throw new NotFoundException('Quality team member not found');

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.subject !== undefined) updateData.subject = data.subject;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.isAutoAssignEnabled !== undefined) updateData.isAutoAssignEnabled = data.isAutoAssignEnabled;
        
        if (data.pin) {
            if (!/^\d{4}$/.test(data.pin)) {
                throw new BadRequestException('PIN must be exactly 4 digits');
            }
            updateData.pin = await bcrypt.hash(data.pin, 10);
        }

        return this.prisma.qualityTeam.update({
            where: { id },
            data: updateData,
            select: { id: true, name: true, email: true, subject: true, isActive: true, isAutoAssignEnabled: true, createdAt: true },
        });
    }

    async remove(id: string) {
        return this.prisma.qualityTeam.update({
            where: { id },
            data: { isActive: false },
            select: { id: true, name: true, isActive: true },
        });
    }

    async validateLogin(email: string, pin: string) {
        const member = await this.prisma.qualityTeam.findUnique({ where: { email } });
        if (!member || !member.isActive) return null;

        const valid = await bcrypt.compare(pin, member.pin);
        if (!valid) return null;

        return { id: member.id, name: member.name, email: member.email, role: 'QUALITY_TEAM' as const };
    }
}
