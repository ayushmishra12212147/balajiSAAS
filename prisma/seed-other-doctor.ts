import { PrismaClient, EmployeeRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const hospital = await prisma.hospital.findFirst();
  if (!hospital) {
    console.error("❌ No hospital found in database.");
    return;
  }

  const otherDocId = "88888888-8888-8888-8888-888888888888";
  
  // 1. Check if Employee already exists
  let employee = await prisma.employee.findUnique({
    where: { id: otherDocId },
  });

  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        id: otherDocId,
        name: "Other",
        employeeCode: "OTHER_DOC",
        email: "other.doctor@swastikhospital.com",
        passwordHash: "$2b$12$N/APasswordHashPlaceholderForOtherDoctor",
        role: EmployeeRole.EMPLOYEE,
        designation: "Consulting Physician",
        mobileNumber: "0000000000",
        joiningDate: new Date(),
        hospitalId: hospital.id,
      },
    });
    console.log(`✅ Created "Other" Employee record.`);
  } else {
    console.log(`ℹ️ "Other" Employee record already exists.`);
  }

  // 2. Check if Doctor already exists
  let doctor = await prisma.doctor.findUnique({
    where: { id: otherDocId },
  });

  if (!doctor) {
    doctor = await prisma.doctor.create({
      data: {
        id: otherDocId,
        registrationNumber: "REG_OTHER_DOC",
        qualification: "Other",
        specialization: "External Consultant",
        consultationFee: 0,
      },
    });
    console.log(`✅ Created "Other" Doctor profile.`);
  } else {
    console.log(`ℹ️ "Other" Doctor profile already exists.`);
  }

  console.log(`🎉 "Other Doctor" placeholder set up with UUID: ${otherDocId}`);
}

main()
  .catch((e) => {
    console.error("Error seeding Other Doctor:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
