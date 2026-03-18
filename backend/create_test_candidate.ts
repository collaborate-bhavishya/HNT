import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    // 1. Create a candidate
    const candidate = await prisma.candidate.create({
        data: {
            firstName: 'Test',
            lastName: 'MathUser',
            email: 'testmath_' + Date.now() + '@example.com',
            phone: '123' + Date.now().toString().slice(-7),
            currentLocation: 'Remote',
            position: 'Math',
            experience: 3,
            cvDriveLink: 'http://example.com/cv.pdf',
            motivation: 'Love math',
            status: 'ASSESSMENT_PENDING'
        }
    });

    // 2. Create the assessment link
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const assessment = await prisma.assessment.create({
        data: {
            candidateId: candidate.id,
            token,
            expiresAt,
            status: 'PENDING'
        }
    });

    console.log(`Assessment Link: http://localhost:5173/assessment/${token}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
