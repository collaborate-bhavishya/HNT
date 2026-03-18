const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const questions = await prisma.question.findMany({
        where: {
            category: 'Python',
        },
        take: 5
    });
    console.log(JSON.stringify(questions, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
