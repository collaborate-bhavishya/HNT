import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class QuestionService {
    constructor(private readonly prisma: PrismaService) { }

    async importQuestions(csvData: string) {
        const lines = csvData.split('\n');
        // Format: #, Category, Difficulty, Question, Option A, Option B, Option C, Option D, Correct Answer

        const dataLines = lines.slice(1);
        const imported: any[] = [];

        for (const line of dataLines) {
            if (!line.trim()) continue;

            const cols = this.parseCsvLine(line);
            const [, category, difficultyRaw, questionText, optA, optB, optC, optD, correctAnswer] = cols;

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
                }
            });
            imported.push(question);
        }
        return { count: imported.length };
    }

    private parseCsvLine(line: string): string[] {
        const result: string[] = [];
        let curValue = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(curValue);
                curValue = "";
            } else {
                curValue += char;
            }
        }
        result.push(curValue);
        return result;
    }

    async getQuestionsByCategory(category: string) {
        return this.prisma.question.findMany({
            where: { category }
        });
    }

    async deleteAllQuestions() {
        return this.prisma.question.deleteMany();
    }
}
