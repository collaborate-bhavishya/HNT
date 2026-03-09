const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const count = await prisma.candidate.count();
        console.log('Database connection successful. Candidate count:', count);
    } catch (err) {
        console.error('Database connection failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
