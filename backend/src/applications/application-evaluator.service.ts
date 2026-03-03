import { Injectable } from '@nestjs/common';

interface EvaluationResult {
    passed: boolean;
    score: number;
    rejectionReason?: string;
}

@Injectable()
export class ApplicationEvaluatorService {
    evaluate(data: {
        position: string;
        experience: number;
        expectedSalary?: number;
    }): EvaluationResult {
        // Hard rejection rules
        if (data.experience < 1) {
            return { passed: false, score: 0, rejectionReason: 'Minimum 1 year experience required' };
        }

        if (data.position === 'Senior Teacher' && data.experience < 3) {
            return { passed: false, score: 0, rejectionReason: 'Senior Teacher requires 3+ years experience' };
        }

        if (data.expectedSalary && data.expectedSalary > 200000) {
            return { passed: false, score: 0, rejectionReason: 'Salary expectation exceeds budget' };
        }

        // Scoring logic
        let score = 50;
        if (data.experience >= 5) score += 30;
        else if (data.experience >= 3) score += 20;
        else score += 10;

        if (data.expectedSalary && data.expectedSalary <= 100000) score += 20;
        else if (data.expectedSalary && data.expectedSalary <= 150000) score += 10;

        return { passed: true, score: Math.min(score, 100) };
    }
}
