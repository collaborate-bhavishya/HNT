const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const topics = ['Python', 'C++'];
    for (const topic of topics) {
        const current = await prisma.question.count({ where: { category: topic } });
        const needed = 15 - current;
        if (needed > 0) {
            console.log(`Adding ${needed} questions for ${topic}`);
            for (let i = 0; i < needed; i++) {
                await prisma.question.create({
                    data: {
                        category: topic,
                        questionText: `[NEW] ${topic} Technical Question ${i + 1}?`,
                        options: ['Option A', 'Option B', 'Option C', 'Option D'],
                        correctAnswer: 'Option A',
                        difficulty: 'easy'
                    }
                });
            }
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
