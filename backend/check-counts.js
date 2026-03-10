const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const counts = await prisma.question.groupBy({
        by: ['category', 'difficulty'],
        _count: true,
    });
    console.log(JSON.stringify(counts, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
