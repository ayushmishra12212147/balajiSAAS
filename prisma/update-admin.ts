import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function fixAdminPassword() {
  const email = "ayushmishraofficial142@gmail.com";
  const password = "Ayush@123#";

  // Hash with bcryptjs
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.employee.update({
    where: { email },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
    },
  });

  console.log(`✅ Admin password re-hashed with Argon2id`);
  console.log(`   Email: ${result.email}`);
  console.log(`   Hash prefix: ${passwordHash.substring(0, 30)}...`);
}

fixAdminPassword()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
