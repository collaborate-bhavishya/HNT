import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QualityTeamService } from './quality-team.service';

@Controller('api/quality-team')
@UseGuards(AuthGuard('jwt'))
export class QualityTeamController {
    constructor(private readonly qualityTeamService: QualityTeamService) {}

    private assertMasterAdmin(user: any) {
        if (user.role !== 'MASTER_ADMIN' && user.role !== 'admin') {
            throw new ForbiddenException('Only master admin can manage quality team');
        }
    }

    @Post()
    async create(@Req() req: any, @Body() data: any) {
        this.assertMasterAdmin(req.user);
        return this.qualityTeamService.create(data);
    }

    @Get()
    async findAll(@Req() req: any) {
        this.assertMasterAdmin(req.user);
        return this.qualityTeamService.findAll();
    }

    @Get('active')
    async findActive(@Req() req: any) {
        this.assertMasterAdmin(req.user);
        return this.qualityTeamService.findActive();
    }

    @Put(':id')
    async update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
        this.assertMasterAdmin(req.user);
        return this.qualityTeamService.update(id, data);
    }

    @Patch(':id')
    async patch(@Req() req: any, @Param('id') id: string, @Body() data: any) {
        this.assertMasterAdmin(req.user);
        return this.qualityTeamService.update(id, data);
    }

    @Delete(':id')
    async remove(@Req() req: any, @Param('id') id: string) {
        this.assertMasterAdmin(req.user);
        return this.qualityTeamService.remove(id);
    }
}
