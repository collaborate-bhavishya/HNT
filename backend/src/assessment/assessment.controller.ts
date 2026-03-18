import { Controller, Get, Param, Post, Body, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { FileFieldsInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { AssessmentService } from './assessment.service';

@Controller('api/assessment')
export class AssessmentController {
    constructor(private readonly assessmentService: AssessmentService) { }

    @Get(':token')
    async verifyToken(@Param('token') token: string) {
        return this.assessmentService.verifyToken(token);
    }

    @Post(':token/start')
    async startAssessment(
        @Param('token') token: string,
        @Body() body: { subject: string; topic?: string }
    ) {
        if (!body.subject) {
            throw new BadRequestException('Subject is required');
        }
        return this.assessmentService.startAssessment(token, body.subject, body.topic);
    }

    @Post(':token/submit')
    @UseInterceptors(AnyFilesInterceptor())
    async submitAssessment(
        @Param('token') token: string,
        @Body() payload: any,
        @UploadedFiles() files: Array<Express.Multer.File>,
    ) {
        return this.assessmentService.evaluateAssessment(token, payload, files);
    }
}
