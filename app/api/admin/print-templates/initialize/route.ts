import { NextRequest, NextResponse } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { getDefaultLayoutFor, getDocumentTitle } from "@/modules/print/templates/default-layouts";
import { Prisma } from "@prisma/client";

// Complete list of 35 templates
const TEMPLATE_KEYS = [
  "OPD_REGISTRATION_SLIP",
  "OPD_PRESCRIPTION",
  "IPD_ADMISSION_FORM",
  "IPD_BED_SLIP",
  "DISCHARGE_SUMMARY",
  "HOSPITAL_INVOICE",
  "PAYMENT_RECEIPT",
  "NO_DUE_CERTIFICATE",
  "BIRTH_CERTIFICATE",
  "DEATH_CERTIFICATE",
  "LABORATORY_SAMPLE_SLIP",
  "LABORATORY_REPORT",
  "RADIOLOGY_REQUEST_SLIP",
  "RADIOLOGY_REPORT",
  "OT_BOOKING_SLIP",
  "OT_SUMMARY",
  "PHARMACY_INVOICE",
  "PHARMACY_RETURN_SLIP",
  "APPOINTMENT_SLIP",
  "MEDICAL_CERTIFICATE",
  // 15 extra clinical records
  "CONSENT_FORM",
  "REFERRAL_LETTER",
  "SICK_LEAVE_CERTIFICATE",
  "FITNESS_CERTIFICATE",
  "VACCINATION_CARD",
  "EMERGENCY_SLIP",
  "PHARMACY_PRESCRIPTION_COPY",
  "OT_CONSENT",
  "NURSING_NOTES",
  "ICU_CHART",
  "BLOOD_BANK_REQUEST",
  "BLOOD_ISSUE_SLIP",
  "INSURANCE_CLAIM_FORM",
  "DIET_SHEET",
  "FOLLOW_UP_CARD",
];

const TEMPLATE_CATEGORIES: Record<string, string> = {
  OPD_REGISTRATION_SLIP: "Patient Registration",
  APPOINTMENT_SLIP: "Patient Registration",
  OPD_PRESCRIPTION: "Clinical",
  LABORATORY_SAMPLE_SLIP: "Clinical",
  LABORATORY_REPORT: "Clinical",
  RADIOLOGY_REQUEST_SLIP: "Clinical",
  RADIOLOGY_REPORT: "Clinical",
  IPD_ADMISSION_FORM: "IPD",
  IPD_BED_SLIP: "IPD",
  DISCHARGE_SUMMARY: "IPD",
  HOSPITAL_INVOICE: "Billing",
  PAYMENT_RECEIPT: "Billing",
  NO_DUE_CERTIFICATE: "Billing",
  BIRTH_CERTIFICATE: "Certificates",
  DEATH_CERTIFICATE: "Certificates",
  MEDICAL_CERTIFICATE: "Certificates",
  OT_BOOKING_SLIP: "OT",
  OT_SUMMARY: "OT",
  PHARMACY_INVOICE: "Pharmacy",
  PHARMACY_RETURN_SLIP: "Pharmacy",
  // 15 extras
  CONSENT_FORM: "IPD",
  REFERRAL_LETTER: "Clinical",
  SICK_LEAVE_CERTIFICATE: "Certificates",
  FITNESS_CERTIFICATE: "Certificates",
  VACCINATION_CARD: "Patient Registration",
  EMERGENCY_SLIP: "IPD",
  PHARMACY_PRESCRIPTION_COPY: "Pharmacy",
  OT_CONSENT: "OT",
  NURSING_NOTES: "IPD",
  ICU_CHART: "IPD",
  BLOOD_BANK_REQUEST: "Clinical",
  BLOOD_ISSUE_SLIP: "Clinical",
  INSURANCE_CLAIM_FORM: "Billing",
  DIET_SHEET: "IPD",
  FOLLOW_UP_CARD: "Patient Registration",
};

/**
 * POST /api/admin/print-templates/initialize
 * Deletes and re-seeds all 35 default system templates.
 */
export const POST = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageUsers");

  const hospitalId = context.employee.hospitalId;

  await prisma.$transaction(async (tx) => {
    // Delete existing system default templates for this hospital
    await tx.printTemplate.deleteMany({
      where: {
        isSystemDefault: true,
        hospitalId,
      },
    });

    // Create system default templates
    for (const key of TEMPLATE_KEYS) {
      const layout = getDefaultLayoutFor(key);
      const title = getDocumentTitle(key);
      const category = TEMPLATE_CATEGORIES[key] || "General";

      await tx.printTemplate.create({
        data: {
          templateKey: key,
          name: `${title} (Default)`,
          category,
          layoutJson: layout as unknown as Prisma.InputJsonValue,
          pageFormat: "A4",
          orientation: "PORTRAIT",
          margins: "15mm",
          copies: 1,
          language: "en",
          hospitalId,
          documentType: key,
          status: "PUBLISHED",
          version: 1,
          isPublished: true,
          isSystemDefault: true,
        },
      });
    }
  });

  return { message: "Successfully initialized all 35 clinical print templates." };
});
