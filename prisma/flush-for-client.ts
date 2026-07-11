/**
 * flush-for-client.ts
 * 
 * Wipes all transactional/test data from the database while preserving:
 *   ✅ Hospital tenant record
 *   ✅ Admin employee + password/credentials  
 *   ✅ Admin permissions
 *   ✅ Departments (preset clinical departments)
 *   ✅ System settings
 *   ✅ Sequences (reset counters to 0)
 * 
 * Usage: npx tsx prisma/flush-for-client.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function flush() {
  console.log("\n🔴 ============================================");
  console.log("   DATABASE FLUSH FOR CLIENT DELIVERY");
  console.log("   ============================================\n");

  // Grab the admin employee so we know what to keep
  const admin = await prisma.employee.findFirst({
    where: { role: "SUPER_ADMIN" },
  });

  if (!admin) {
    console.error("❌ No SUPER_ADMIN employee found. Aborting flush.");
    process.exit(1);
  }

  console.log(`✅ Preserving admin: ${admin.name} (${admin.email})`);
  console.log(`✅ Preserving hospital ID: ${admin.hospitalId}\n`);

  // =============================================
  // DELETE in dependency order (children first)
  // =============================================
  // We use raw SQL TRUNCATE CASCADE for speed and safety
  // But we need to be careful to preserve admin-related rows

  const tablesToTruncate = [
    // 12. Audit logs
    "audits",

    // 11. Print engine
    "print_histories",
    "print_templates",

    // 10. Pharmacy (children first)
    "pharmacy_return_items",
    "pharmacy_returns",
    "pharmacy_invoice_payments",
    "pharmacy_invoice_items",
    "pharmacy_invoices",
    "pharmacy_stock_adjustments",
    "pharmacy_purchase_items",
    "pharmacy_purchase_orders",
    "medicine_stocks",
    "medicines",

    // 9. Vital registrations
    "radiology_findings_revisions",
    "lab_result_revisions",
    "discharge_summary_revisions",
    "death_registrations",
    "birth_registrations",

    // 8. Billing & Finance (children first)
    "patient_deposit_allocations",
    "patient_deposits",
    "refunds",
    "payments",
    "invoice_charge_mappings",
    "invoices",
    "billable_charges",
    "charge_catalogs",

    // 7. Diagnostics
    "radiology_scan_orders",
    "radiology_scan_catalogs",
    "lab_test_results",
    "lab_test_orders",
    "lab_test_catalogs",

    // 6. OT
    "operation_theater_revisions",
    "operation_theaters",

    // 5. Clinical visit IPD sub-models
    "ipd_clinical_attachments",
    "ipd_nursing_tasks",
    "ipd_handovers",
    "ipd_consultations_clinical",
    "ipd_intake_output",
    "ipd_treatment_orders",
    "ipd_progress_notes",
    "ipd_doctor_rounds",
    "ipd_vitals",
    "ipd_timeline_events",
    "ipd_attendants",
    "doctor_assignment_history",

    // 5. Clinical visits
    "bed_transfer_history",
    "ipd_admissions",
    "opd_consultations",

    // 4. Ward & Bed
    "beds",
    "bed_rooms",
    "wards",
    "floors",
    "buildings",

    // 3. Patient registry
    "patient_referrals",
    "patient_emergency_contacts",
    "patient_addresses",
    "patients",

    // 2. Doctors (linked 1:1 with employees, but only non-admin)
    "doctors",
  ];

  console.log("🗑️  Flushing transactional data...\n");

  for (const table of tablesToTruncate) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
      console.log(`   ✓ Truncated: ${table}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`   ⚠ Skipped ${table}: ${message}`);
    }
  }

  // =============================================
  // Clean up sessions (delete all — admin will re-login)
  // =============================================
  console.log("\n🔐 Clearing all sessions...");
  await prisma.session.deleteMany({});
  console.log("   ✓ Sessions cleared");

  // =============================================
  // Delete non-admin employees & their permissions
  // =============================================
  console.log("\n👤 Removing non-admin employees...");
  
  // First delete permissions for non-admin employees
  await prisma.permission.deleteMany({
    where: { userId: { not: admin.id } },
  });
  console.log("   ✓ Non-admin permissions removed");

  // Delete non-admin employees
  const deletedEmployees = await prisma.employee.deleteMany({
    where: { id: { not: admin.id } },
  });
  console.log(`   ✓ Removed ${deletedEmployees.count} non-admin employees`);

  // =============================================
  // Reset sequences back to 0
  // =============================================
  console.log("\n🔢 Resetting sequences...");
  const resetResult = await prisma.sequence.updateMany({
    data: { currentValue: 0 },
  });
  console.log(`   ✓ Reset ${resetResult.count} sequences to 0`);

  // =============================================
  // Reset admin login state
  // =============================================
  console.log("\n🔑 Resetting admin login state...");
  await prisma.employee.update({
    where: { id: admin.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: null,
      lastLoginIp: null,
    },
  });
  console.log("   ✓ Admin login state reset");

  // =============================================
  // Summary
  // =============================================
  console.log("\n✅ ============================================");
  console.log("   DATABASE FLUSH COMPLETE!");
  console.log("   ============================================");
  console.log("\n   Preserved:");
  console.log("   • Hospital tenant record");
  console.log("   • Admin employee + credentials");
  console.log("   • Admin permissions");
  console.log("   • Clinical departments");
  console.log("   • System settings");
  console.log("   • Sequences (reset to 0)");
  console.log("\n   Cleared:");
  console.log("   • All patients & patient data");
  console.log("   • All OPD consultations");
  console.log("   • All IPD admissions & clinical data");
  console.log("   • All billing, invoices & payments");
  console.log("   • All lab & radiology orders");
  console.log("   • All OT bookings");
  console.log("   • All pharmacy data & stock");
  console.log("   • All birth & death registrations");
  console.log("   • All print templates & history");
  console.log("   • All audit logs");
  console.log("   • All sessions");
  console.log("   • All non-admin employees & doctors");
  console.log("   • Ward/bed infrastructure");
  console.log("\n   📋 Ready for client handover!\n");
}

flush()
  .catch((e) => {
    console.error("\n❌ Flush failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
