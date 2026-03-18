const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const questions = await prisma.question.findMany({
        where: {
            category: { equals: 'Python', mode: 'insensitive' },
        }
    });
    
    console.log(`\nTotal Python questions in DB: ${questions.length}\n`);

    if (questions.length > 0) {
        console.log("Sample of 3 questions:");
        console.log(JSON.stringify(questions.slice(0, 3), null, 2));
    } else {
        console.log("No Python questions found in DB.");
    }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
