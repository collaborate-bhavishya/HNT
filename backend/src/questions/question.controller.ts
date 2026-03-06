import { Controller, Post, Get, Param, UploadedFile, UseInterceptors, BadRequestException, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuestionService } from './question.service';
import type { Express } from 'express';

@Controller('api/questions')
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

    @Delete('all')
    async deleteAll() {
        return this.questionService.deleteAllQuestions();
    }
}
