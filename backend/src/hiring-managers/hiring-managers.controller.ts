import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HiringManagersService } from './hiring-managers.service';

@Controller('api/hiring-managers')
@UseGuards(AuthGuard('jwt'))
export class HiringManagersController {
    constructor(private readonly service: HiringManagersService) {}

    private assertMasterAdmin(user: any) {
        if (user.role !== 'MASTER_ADMIN' && user.role !== 'admin') {
            throw new ForbiddenException('Only master admin can manage hiring managers');
        }
    }

    @Post()
    async create(@Req() req: any, @Body() body: { name: string; email: string; password: string; phone?: string; subject?: string }) {
        this.assertMasterAdmin(req.user);
        return this.service.create(body);
    }

    @Get()
    async findAll(@Req() req: any) {
        this.assertMasterAdmin(req.user);
        return this.service.findAll();
    }

    @Get('active')
    async findActive(@Req() req: any) {
        this.assertMasterAdmin(req.user);
        return this.service.findActive();
    }

    @Put(':id')
    async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
        this.assertMasterAdmin(req.user);
        return this.service.update(id, body);
    }

    @Delete(':id')
    async remove(@Req() req: any, @Param('id') id: string) {
        this.assertMasterAdmin(req.user);
        return this.service.remove(id);
    }
}
