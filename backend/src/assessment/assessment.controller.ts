import { Controller, Get, Param, Post, Body, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
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
        @Body('topic') topic: string
    ) {
        if (!topic) {
            throw new BadRequestException('Topic is required parameter');
        }
        return this.assessmentService.startAssessment(token, topic);
    }

    @Post(':token/submit')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'introAudio', maxCount: 1 },
        { name: 'audio', maxCount: 1 },
    ]))
    async submitAssessment(
        @Param('token') token: string,
        @Body() payload: any,
        @UploadedFiles() files: { introAudio?: Express.Multer.File[]; audio?: Express.Multer.File[] },
    ) {
        const introFile = files?.introAudio?.[0];
        const teachingFile = files?.audio?.[0];
        if (!teachingFile) {
            throw new BadRequestException('Teaching audio file is required');
        }
        return this.assessmentService.evaluateAssessment(token, payload, teachingFile, introFile);
    }
}
