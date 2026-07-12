import { PrismaClient, EmployeeRole } from "@prisma/client";
import { PasswordService } from "@/modules/auth/services/password-provider";

const prisma = new PrismaClient();

const MODULES_AND_ACTIONS = [
  { module: "Patient", actions: ["View", "Create", "Edit", "Delete", "Print"] },
  { module: "OPD", actions: ["View", "Register", "Edit", "Cancel", "Print"] },
  { module: "IPD", actions: ["View", "Admit", "Discharge", "Transfer Bed", "Assign Charges", "Reassign Doctor", "Register Birth", "Register Death", "Print"] },
  { module: "Billing", actions: ["View", "Receive Payment", "Refund", "Cancel Invoice", "Apply Discount", "Generate Invoice", "Print"] },
  { module: "Laboratory", actions: ["View", "Schedule", "Complete", "Print"] },
  { module: "OT", actions: ["View", "Schedule", "Complete", "Print", "Assign Charges", "Register", "Close Operation"] },
  { module: "Pharmacy", actions: ["View", "Purchase", "Sell", "Stock Adjustment", "Return", "Print"] },
  { module: "Reports", actions: ["View", "Export", "Print"] },
  { module: "Admin", actions: ["View", "ManageHospital", "ManageUsers", "ManagePermissions", "ManageSettings", "ManageTemplates", "PublishTemplate", "ManageNumbering", "Backup", "Restore", "ViewAudit", "Maintenance", "License", "Sessions"] },
];

async function main() {
  // 1. Seed Hospital Tenant
  console.log("Seeding default hospital details...");
  let hospital = await prisma.hospital.findFirst();

  if (!hospital) {
    hospital = await prisma.hospital.create({
      data: {
        name: "Swastik Hospital",
        code: "SH",
        phone: "0123456789",
        email: "info@swastikhospital.com",
        address: "Circular Road, Swastik Complex, NCR",
        currentVersion: "2.0.0",
      },
    });
    console.log(`Default hospital created: ${hospital.name} (Code: ${hospital.code})`);
  } else {
    console.log(`Hospital tenant already exists: ${hospital.name}`);
  }

  // 2. Seed Default Administrator Employee
  const email = process.env.DEFAULT_ADMIN_EMAIL || "ayushmishraofficial142@gmail.com";
  // Password is hashed at seed time — never stored in plaintext config files
  const password = "Ayush@123#";

  console.log(`Seeding database default administrator: ${email}...`);

  // Check if admin employee exists — upsert to handle re-runs gracefully
  const passwordHash = await PasswordService.hash(password);
  const admin = await prisma.employee.upsert({
    where: { email },
    update: {
      passwordHash,
      passwordChangedAt: new Date(),
    },
    create: {
      employeeCode: "EMP001",
      name: "System Administrator",
      email,
      passwordHash,
      role: EmployeeRole.SUPER_ADMIN,
      designation: "System Administrator",
      mobileNumber: "9999999999",
      joiningDate: new Date(),
      isActive: true,
      passwordChangedAt: new Date(),
      hospitalId: hospital.id,
    },
  });
  console.log(`Admin employee ready with ID: ${admin.id}`);

  // 3. Seed Permissions
  let seededCount = 0;
  for (const item of MODULES_AND_ACTIONS) {
    for (const action of item.actions) {
      // Check if permission already exists
      const existing = await prisma.permission.findUnique({
        where: {
          userId_module_action: {
            userId: admin.id,
            module: item.module,
            action,
          },
        },
      });

      if (!existing) {
        await prisma.permission.create({
          data: {
            userId: admin.id,
            module: item.module,
            action,
            isAllowed: true, // admin has all permissions by default
          },
        });
        seededCount++;
      }
    }
  }

  console.log(`Successfully seeded ${seededCount} permission rules for Admin.`);

  // 4. Seed Preset Clinical Departments
  console.log("Seeding clinical department presets...");
  const PRESET_DEPARTMENTS = [
    { name: "Medicine", code: "MED", description: "General medicine and internal consultations" },
    { name: "Surgery", code: "SURG", description: "General surgical procedures and consultations" },
    { name: "Pediatrics", code: "PED", description: "Children wellness and pediatric care" },
    { name: "Orthopedic", code: "ORTHO", description: "Bone, joint, and orthopedic care" },
    { name: "Obstetrics & Gynecology", code: "OBGYN", description: "Maternal, obstetric, and gynecological care" },
    { name: "ENT", code: "ENT", description: "Ear, nose, and throat treatment" },
    { name: "Ophthalmology", code: "OPHTH", description: "Eye health and ophthalmic care" },
    { name: "Dermatology", code: "DERM", description: "Skin wellness and dermatological care" },
    { name: "Psychiatry", code: "PSYCH", description: "Mental health and psychiatric consultations" },
    { name: "Emergency", code: "EMER", description: "24/7 urgent and emergency care" },
    { name: "Dental", code: "DENT", description: "Oral care and dental treatment" },
  ];

  let deptsSeeded = 0;
  for (const dept of PRESET_DEPARTMENTS) {
    const existing = await prisma.department.findUnique({
      where: { code: dept.code },
    });

    if (!existing) {
      await prisma.department.create({
        data: {
          name: dept.name,
          code: dept.code,
          description: dept.description,
          isDeleted: false,
        },
      });
      deptsSeeded++;
    }
  }
  console.log(`Seeded ${deptsSeeded} clinical department presets.`);
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
