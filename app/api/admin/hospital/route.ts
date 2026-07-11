import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { HospitalSettingsSchema } from "@/modules/admin/schemas";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { AppError } from "@/server/errors";

/**
 * GET /api/admin/hospital
 * Retrieves active hospital profile details.
 */
export const GET = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageHospital");

  const hospital = await prisma.hospital.findUnique({
    where: { id: context.employee.hospitalId },
  });

  if (!hospital || hospital.isDeleted) {
    throw new AppError("Hospital profile not found", 404, "NOT_FOUND");
  }

  return hospital;
});

/**
 * PUT /api/admin/hospital
 * Updates hospital profile columns and records state diffs in audits.
 */
export const PUT = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageHospital");

  const body = await req.json();
  const validated = ValidationService.validate(HospitalSettingsSchema, body);

  const before = await prisma.hospital.findUnique({
    where: { id: context.employee.hospitalId },
  });

  if (!before || before.isDeleted) {
    throw new AppError("Hospital profile not found", 404, "NOT_FOUND");
  }

  const updated = await prisma.hospital.update({
    where: { id: context.employee.hospitalId },
    data: {
      name: validated.name,
      code: validated.code,
      phone: validated.phone,
      email: validated.email,
      address: validated.address,
      gstNumber: validated.gstNumber,
      registrationNumber: validated.registrationNumber,
      website: validated.website,
      logoUrl: validated.logoUrl,
      footerText: validated.footerText,
    },
  });

  await logAdminAction({
    action: "HOSPITAL_UPDATE",
    resource: "Hospital",
    entityId: updated.id,
    previousState: before,
    newState: updated,
    description: `Updated hospital identity configurations for ${updated.name}`,
  });

  return updated;
});
