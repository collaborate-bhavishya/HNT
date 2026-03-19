import { Controller, Post, Get, Param, UploadedFile, UseInterceptors, BadRequestException, Delete, Body, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { QuestionService } from './question.service';
import type { Express } from 'express';

@Controller('api/questions')
@UseGuards(AuthGuard('jwt'))
export class QuestionController {
    constructor(private readonly questionService: QuestionService) { }

    @Post('import')
    @UseInterceptors(FileInterceptor('file'))
    async importQuestions(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('CSV file is required');
        }
        const csvData = file.buffer.toString('utf-8');
        return this.questionService.importQuestions(csvData);
    }

    @Get('category/:category')
    async getByCategory(@Param('category') category: string) {
        return this.questionService.getQuestionsByCategory(category);
    }

    @Get('subject/:subject')
    async getBySubject(@Param('subject') subject: string) {
        return this.questionService.getQuestionsBySubject(subject);
    }

    @Delete('all')
    async deleteAll() {
        return this.questionService.deleteAllQuestions();
    }

    // --- Audio Questions API ---

    @Get('audio/:subject')
    async getAudioQuestions(@Param('subject') subject: string) {
        return this.questionService.getAudioQuestionsBySubject(subject);
    }

    @Post('audio')
    async createAudioQuestion(@Body() body: { subject: string; questionText: string }) {
        if (!body.subject || !body.questionText) {
            throw new BadRequestException('Subject and questionText is required');
        }
        return this.questionService.createAudioQuestion(body);
    }

    @Delete('audio/:id')
    async deleteAudioQuestion(@Param('id') id: string) {
        return this.questionService.deleteAudioQuestion(id);
    }
}
