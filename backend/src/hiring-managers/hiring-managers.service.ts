import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class HiringManagersService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: { name: string; email: string; password: string; phone?: string }) {
        const existing = await this.prisma.hiringManager.findUnique({ where: { email: data.email } });
        if (existing) throw new BadRequestException('A hiring manager with this email already exists');

        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.prisma.hiringManager.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                phone: data.phone || null,
            },
            select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true },
        });
    }

    async findAll() {
        const managers = await this.prisma.hiringManager.findMany({
            select: {
                id: true, name: true, email: true, phone: true, isActive: true, createdAt: true,
                _count: { select: { candidates: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return managers.map(m => ({ ...m, candidateCount: m._count.candidates, _count: undefined }));
    }

    async findActive() {
        return this.prisma.hiringManager.findMany({
            where: { isActive: true },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' },
        });
    }

    async update(id: string, data: { name?: string; email?: string; password?: string; phone?: string; isActive?: boolean }) {
        const manager = await this.prisma.hiringManager.findUnique({ where: { id } });
        if (!manager) throw new NotFoundException('Hiring manager not found');

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.password) updateData.password = await bcrypt.hash(data.password, 10);

        return this.prisma.hiringManager.update({
            where: { id },
            data: updateData,
            select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true },
        });
    }

    async remove(id: string) {
        return this.prisma.hiringManager.update({
            where: { id },
            data: { isActive: false },
            select: { id: true, name: true, isActive: true },
        });
    }

    async validateLogin(email: string, password: string) {
        const manager = await this.prisma.hiringManager.findUnique({ where: { email } });
        if (!manager || !manager.isActive) return null;

        const valid = await bcrypt.compare(password, manager.password);
        if (!valid) return null;

        return { id: manager.id, name: manager.name, email: manager.email, role: 'HIRING_MANAGER' as const };
    }
}
