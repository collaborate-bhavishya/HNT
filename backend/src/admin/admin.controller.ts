import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';

@Controller('api/admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('candidates')
    async getAllCandidates() {
        return this.adminService.getAllCandidates();
    }

    @Get('candidates/:id')
    async getCandidateDetails(@Param('id') id: string) {
        return this.adminService.getCandidateDetails(id);
    }
}
