const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const questions = await prisma.question.findMany({
        where: {
            subject: { equals: 'Math', mode: 'insensitive' },
        }
    });
    
    console.log(`\nTotal Math questions in DB: ${questions.length}\n`);

    if (questions.length > 0) {
        console.log("Sample of 3 Math questions:");
        console.log(JSON.stringify(questions.slice(0, 3), null, 2));
    } else {
        console.log("No Math questions found in DB.");
    }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
