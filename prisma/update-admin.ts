import { PrismaClient } from "@prisma/client";

// Use argon2 since it's available and is the active PasswordService provider
import argon2 from "argon2";

const prisma = new PrismaClient();

async function fixAdminPassword() {
  const email = "ayushmishraofficial142@gmail.com";
  const password = "Ayush@123#";

  // Hash with argon2id (matching PasswordService's active provider)
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

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
