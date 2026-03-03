import { Controller, Get, Param } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('api/admin')
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
