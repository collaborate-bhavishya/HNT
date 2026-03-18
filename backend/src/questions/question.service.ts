import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class QuestionService {
    constructor(private readonly prisma: PrismaService) { }

    async importQuestions(csvData: string) {
        // Format: #, Category, Difficulty, Question, Option A, Option B, Option C, Option D, Correct Answer[, subject]
        const rows = this.parseCsv(csvData);
        const dataRows = rows.slice(1);
        const imported: any[] = [];

        for (const cols of dataRows) {
            const [, category, difficultyRaw, questionText, optA, optB, optC, optD, correctAnswer, subject] = cols;

            if (!category || !questionText) continue;

            let difficulty = (difficultyRaw || 'medium').trim().toLowerCase();
            if (difficulty === 'low') difficulty = 'easy';
            if (difficulty === 'high') difficulty = 'hard';

            const options = [optA, optB, optC, optD].map(o => (o || '').trim()).filter(Boolean);

            const question = await this.prisma.question.create({
                data: {
                    category: category.trim(),
                    questionText: questionText.trim(),
                    options: options,
                    correctAnswer: (correctAnswer || '').trim(),
                    difficulty,
                    subject: (subject || 'coding').trim(),
                }
            });
            imported.push(question);
        }
        return { count: imported.length };
    }

    private parseCsv(csvData: string): string[][] {
        const rows: string[][] = [];
        let row: string[] = [];
        let cell = '';
        let inQuotes = false;

        for (let i = 0; i < csvData.length; i++) {
            const ch = csvData[i];
            const next = csvData[i + 1];

            if (inQuotes) {
                if (ch === '"' && next === '"') {
                    cell += '"';
                    i++;
                } else if (ch === '"') {
                    inQuotes = false;
                } else {
                    cell += ch;
                }
            } else {
                if (ch === '"') {
                    inQuotes = true;
                } else if (ch === ',') {
                    row.push(cell);
                    cell = '';
                } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
                    row.push(cell);
                    cell = '';
                    if (row.some(c => c.trim())) rows.push(row);
                    row = [];
                    if (ch === '\r') i++;
                } else {
                    cell += ch;
                }
            }
        }

        row.push(cell);
        if (row.some(c => c.trim())) rows.push(row);
        return rows;
    }

    async getQuestionsByCategory(category: string) {
        return this.prisma.question.findMany({
            where: { category: { equals: category, mode: 'insensitive' } }
        });
    }

    async getQuestionsBySubject(subject: string) {
        return this.prisma.question.findMany({
            where: { subject: { equals: subject, mode: 'insensitive' } }
        });
    }

    async getQuestionsBySubjectAndCategory(subject: string, category: string) {
        return this.prisma.question.findMany({
            where: { 
                subject: { equals: subject, mode: 'insensitive' }, 
                category: { equals: category, mode: 'insensitive' } 
            }
        });
    }

    // --- Audio Questions ---
    async getAudioQuestionsBySubject(subject: string) {
        return this.prisma.audioQuestion.findMany({
            where: { subject: { equals: subject, mode: 'insensitive' } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async createAudioQuestion(data: { subject: string; questionText: string }) {
        return this.prisma.audioQuestion.create({
            data,
        });
    }

    async deleteAudioQuestion(id: string) {
        return this.prisma.audioQuestion.delete({
            where: { id },
        });
    }

    async deleteAllQuestions() {
        return this.prisma.question.deleteMany();
    }
}
