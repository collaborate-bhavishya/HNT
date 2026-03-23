import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
  const admin = await prisma.adminUser.findFirst();
  if (admin) {
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash: hashedPassword }
    });
    console.log(`Admin email: ${admin.email}`);
    console.log(`Admin password reset to: ${defaultPassword}`);
  } else {
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    await prisma.adminUser.create({
      data: {
        email: 'admin@bhavishya.com',
        passwordHash: hashedPassword,
        name: 'Master Admin',
        role: 'MASTER_ADMIN'
      }
    });
    console.log(`Created admin admin@bhavishya.com with password ${defaultPassword}`);
  }
}
main();
