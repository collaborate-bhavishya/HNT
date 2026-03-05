import { Controller, Post, Body, UseInterceptors, UploadedFile, Get, BadRequestException } from '@nestjs/common';
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

    @Get('test-email')
    async testEmail() {
        const nodemailer = require('nodemailer');
        try {
            let transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || "smtp.gmail.com",
                port: parseInt(process.env.SMTP_PORT || '465', 10),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            let info = await transporter.sendMail({
                from: '"Testing Render" <' + process.env.SMTP_USER + '>',
                to: "collaborate.bhavishya@gmail.com",
                subject: "Render SMTP Debug Test",
                text: "Testing from Render!",
            });
            return { success: true, messageId: info.messageId };
        } catch (error) {
            return { success: false, error: String(error), stack: error.stack };
        }
    }
}
