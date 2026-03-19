import { Controller, Get, Param, UseGuards, Req, Post, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';

@Controller('api/admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('candidates')
    async getAllCandidates(@Req() req: any) {
        return this.adminService.getAllCandidates(req.user);
    }

    @Get('candidates/:id')
    async getCandidateDetails(@Param('id') id: string) {
        return this.adminService.getCandidateDetails(id);
    }

    @Get('dashboard-config/:subject')
    async getDashboardConfig(@Param('subject') subject: string) {
        return this.adminService.getDashboardConfig(subject);
    }

    @Post('dashboard-config')
    async saveDashboardConfig(@Body() data: any) {
        return this.adminService.saveDashboardConfig(data);
    }
}
