import { Controller, Get, Param, Post, Body, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssessmentService } from './assessment.service';

@Controller('api/assessment')
export class AssessmentController {
    constructor(private readonly assessmentService: AssessmentService) { }

    @Get(':token')
    async verifyToken(@Param('token') token: string) {
        return this.assessmentService.verifyToken(token);
    }

    @Post(':token/submit')
    @UseInterceptors(FileInterceptor('audio'))
    async submitAssessment(
        @Param('token') token: string,
        @Body() payload: any,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('Audio file is required');
        }
        return this.assessmentService.evaluateAssessment(token, payload, file);
    }
}
