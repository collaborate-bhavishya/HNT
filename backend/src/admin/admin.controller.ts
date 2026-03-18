import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
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
}
