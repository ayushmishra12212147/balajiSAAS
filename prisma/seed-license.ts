import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LICENSE_SALT = "HMS_V2_PROD_READY_SECRET_SALT_2026";

async function seedLicense() {
  // License data — valid for 10 years
  const licenseData = {
    expiryDate: "2036-12-31",
    registeredHospital: "Balaji Hospital",
    registeredOwner: "Ayush Mishra",
    version: "2.0.0",
  };

  // Generate the activation key using the same algorithm as LicenseService
  const dataToSign = `${licenseData.registeredHospital}|${licenseData.registeredOwner}|${licenseData.expiryDate}|${licenseData.version}`;
  const hash = crypto.createHash("sha256").update(dataToSign + LICENSE_SALT).digest("hex").toUpperCase();
  const licenseKey = [
    hash.substring(0, 5),
    hash.substring(5, 10),
    hash.substring(10, 15),
    hash.substring(15, 20),
    hash.substring(20, 25),
  ].join("-");

  // Upsert license_key
  await prisma.systemSetting.upsert({
    where: { settingKey: "license_key" },
    update: { settingValue: licenseKey },
    create: { settingKey: "license_key", settingValue: licenseKey },
  });

  // Upsert license_data
  await prisma.systemSetting.upsert({
    where: { settingKey: "license_data" },
    update: { settingValue: JSON.stringify(licenseData) },
    create: { settingKey: "license_data", settingValue: JSON.stringify(licenseData) },
  });

  // Upsert maintenance_block_on_expiry
  await prisma.systemSetting.upsert({
    where: { settingKey: "maintenance_block_on_expiry" },
    update: { settingValue: JSON.stringify(true) },
    create: { settingKey: "maintenance_block_on_expiry", settingValue: JSON.stringify(true) },
  });

  console.log("✅ License activated successfully!");
  console.log(`   Hospital:  ${licenseData.registeredHospital}`);
  console.log(`   Owner:     ${licenseData.registeredOwner}`);
  console.log(`   Expiry:    ${licenseData.expiryDate}`);
  console.log(`   Key:       ${licenseKey}`);
}

seedLicense()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
