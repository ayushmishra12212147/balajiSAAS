import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  const logoPath = "C:\\Users\\ayush\\Downloads\\Logo Swastik.jpeg";
  
  if (!fs.existsSync(logoPath)) {
    console.error(`❌ Logo file not found at path: ${logoPath}`);
    return;
  }

  console.log(`Reading logo file from: ${logoPath}`);
  const fileBuffer = fs.readFileSync(logoPath);
  const base64Data = fileBuffer.toString("base64");
  const logoUrl = `data:image/jpeg;base64,${base64Data}`;

  const hospital = await prisma.hospital.findFirst();

  if (hospital) {
    const updated = await prisma.hospital.update({
      where: { id: hospital.id },
      data: {
        logoUrl: logoUrl,
      },
    });
    console.log(`✅ Hospital logo updated successfully in the database for: ${updated.name}`);
    console.log(`   Logo URL length: ${updated.logoUrl?.length} characters`);
  } else {
    console.log("❌ No hospital record found in database.");
  }
}

main()
  .catch((e) => {
    console.error("Error during logo update:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
