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
        available120Hours?: boolean;
        openToWeekends?: boolean;
        comfortableNightShifts?: boolean;
        motivation?: string;
    }): EvaluationResult {
        // === INSTANT REJECTION RULES ===

        // Rule 2: Must be available for 120 hours/month (operational requirement)
        if (data.available120Hours === false) {
            return { passed: false, score: 0, rejectionReason: 'Must be available for 120 hours/month' };
        }

        // Rule 3: Must be open to weekends (most classes happen here)
        if (data.openToWeekends === false) {
            return { passed: false, score: 0, rejectionReason: 'Must be open to working weekends' };
        }

        // === SCORING MODEL (0-100) ===

        // Base score: 40 for all passing candidates
        let score = 40;

        // Experience score
        if (data.experience >= 5) score += 30;
        else if (data.experience >= 3) score += 20;
        else score += 10; // 1-2 years

        // Availability score: night shifts
        if (data.comfortableNightShifts) score += 10;

        // Motivation quality (simple length check before Gemini)
        const motivationLength = (data.motivation || '').length;
        if (motivationLength > 150) score += 10;
        else if (motivationLength > 50) score += 5;

        // Cap at 100
        score = Math.min(score, 100);

        // === PASS/FAIL THRESHOLD ===
        if (score < 50) {
            return { passed: false, score, rejectionReason: 'Application did not meet minimum evaluation score' };
        }

        return { passed: true, score };
    }
}
