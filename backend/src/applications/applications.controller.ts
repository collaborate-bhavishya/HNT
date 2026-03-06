import { Controller, Post, Body, UseInterceptors, UploadedFile, Get, Param, BadRequestException } from '@nestjs/common';
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

    @Get()
    async getAllApplications() {
        return this.applicationsService.getAllCandidates();
    }

    @Get(':id')
    async getCandidateById(@Param('id') id: string) {
        return this.applicationsService.getCandidateById(id);
    }
}
