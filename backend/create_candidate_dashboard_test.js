const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function main() {
  const pin = "1234";
  const email = "test_candidate_" + Date.now() + "@example.com";
  
  const candidate = await prisma.candidate.create({
    data: {
      firstName: "Test",
      lastName: "Candidate",
      email: email,
      phone: "555-" + Math.floor(1000 + Math.random() * 9000),
      position: "Frontend Developer",
      experience: 3,
      status: "SELECTED",
      pin: pin,
      layer1Score: 85,
    }
  });

  const assessment = await prisma.assessment.create({
      data: {
          candidateId: candidate.id,
          token: crypto.randomUUID(),
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          status: 'PENDING'
      }
  });

  console.log("-----------------------------------------");
  console.log("✅ TEST CANDIDATE CREATED SUCCESSFULLY!");
  console.log("-----------------------------------------");
  console.log("Login Email :", email);
  console.log("Login PIN   :", pin);
  console.log("-----------------------------------------");
  console.log("You can now go to http://localhost:5173/candidate-login and use these credentials to test the dashboard!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
