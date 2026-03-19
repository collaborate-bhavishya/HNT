import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HiringManagersService } from '../../hiring-managers/hiring-managers.service';
import { QualityTeamService } from '../../quality-team/quality-team.service';

const MASTER_ADMIN_EMAIL = process.env.MASTER_ADMIN_EMAIL || 'bhavishya@brightchamps.store';
const MASTER_ADMIN_PASSWORD = process.env.MASTER_ADMIN_PASSWORD || 'masteradmin@brightchamps';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private hiringManagersService: HiringManagersService,
        private qualityTeamService: QualityTeamService,
    ) {}

    async login(body: { email: string; password: string }) {
        const { email, password } = body;

        if (email === MASTER_ADMIN_EMAIL && password === MASTER_ADMIN_PASSWORD) {
            return {
                role: 'MASTER_ADMIN',
                name: 'Master Admin',
                email: MASTER_ADMIN_EMAIL,
                access_token: this.jwtService.sign({ email, role: 'MASTER_ADMIN' }),
            };
        }

        const manager = await this.hiringManagersService.validateLogin(email, password);
        if (manager) {
            return {
                role: 'HIRING_MANAGER',
                id: manager.id,
                name: manager.name,
                email: manager.email,
                access_token: this.jwtService.sign({ email, role: 'HIRING_MANAGER', managerId: manager.id }),
            };
        }

        const qualityMember = await this.qualityTeamService.validateLogin(email, password);
        if (qualityMember) {
            return {
                role: 'QUALITY_TEAM',
                id: qualityMember.id,
                name: qualityMember.name,
                email: qualityMember.email,
                access_token: this.jwtService.sign({ email, role: 'QUALITY_TEAM', qualityId: qualityMember.id }),
            };
        }

        throw new UnauthorizedException('Invalid email or password');
    }
}
