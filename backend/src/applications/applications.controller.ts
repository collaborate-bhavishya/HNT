import { Controller, Post, Body, UseInterceptors, UploadedFile, Get, Param, Query, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './create-application.dto';

@Controller('api/applications')
export class ApplicationsController {
    constructor(private readonly applicationsService: ApplicationsService) { }

    @Post()
    @UseInterceptors(FileInterceptor('cv'))
    async submitApplication(
        @Body() createApplicationDto: CreateApplicationDto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!createApplicationDto.email || !createApplicationDto.phone) {
            throw new BadRequestException('Email and phone are required');
        }
        return this.applicationsService.submitApplication(createApplicationDto, file);
    }

    @Post(':id/status')
    async updateCandidateStatus(
        @Param('id') id: string,
        @Body('status') status: string,
        @Body('comment') comment?: string,
    ) {
        return this.applicationsService.updateCandidateStatus(id, status, comment);
    }

    @Get()
    async getAllApplications(@Query('managerId') managerId?: string) {
        return this.applicationsService.getAllCandidates(managerId);
    }

    @Get(':id')
    async getCandidateById(@Param('id') id: string) {
        return this.applicationsService.getCandidateById(id);
    }

    @Post(':id/send-reminder')
    async sendReminder(@Param('id') id: string) {
        return this.applicationsService.sendAssessmentReminder(id);
    }

    @Post(':id/assign')
    async assignHiringManager(
        @Param('id') id: string,
        @Body('hiringManagerId') hiringManagerId: string | null,
    ) {
        return this.applicationsService.assignHiringManager(id, hiringManagerId);
    }
}
