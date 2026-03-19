import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QualityTeamService } from './quality-team.service';

@Controller('api/quality-team')
export class QualityTeamController {
    constructor(private readonly qualityTeamService: QualityTeamService) {}

    @UseGuards(AuthGuard('jwt'))
    @Post()
    async create(@Body() data: any) {
        return this.qualityTeamService.create(data);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get()
    async findAll() {
        return this.qualityTeamService.findAll();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('active')
    async findActive() {
        return this.qualityTeamService.findActive();
    }

    @UseGuards(AuthGuard('jwt'))
    @Put(':id')
    async update(@Param('id') id: string, @Body() data: any) {
        return this.qualityTeamService.update(id, data);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':id')
    async patch(@Param('id') id: string, @Body() data: any) {
        return this.qualityTeamService.update(id, data);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.qualityTeamService.remove(id);
    }
}
