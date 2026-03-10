const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const candidates = await prisma.candidate.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { assessments: true }
    });
    console.log(JSON.stringify(candidates.map(c => ({
        id: c.id,
        name: c.firstName + ' ' + (c.lastName || ''),
        status: c.status,
        cv: c.cvDriveLink,
        assessments: c.assessments.map(a => ({
            id: a.id,
            audio: a.audioDriveLink,
            mcq: a.mcqScore,
            status: a.status
        }))
    })), null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
