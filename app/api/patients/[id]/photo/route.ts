import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";

/**
 * PUT /api/patients/[id]/photo
 * Simulated patient photo update. Saves the image reference URL.
 */
export const PUT = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Patient", "Edit");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  const photoUrl = body.photoUrl;

  if (typeof photoUrl !== "string") {
    throw new AppError("Photo URL string parameter is required.", 400, "BAD_REQUEST");
  }

  const patient = await prisma.patient.findUnique({
    where: { id, isDeleted: false },
    select: { name: true, uhid: true, photoUrl: true },
  });

  if (!patient) {
    throw new AppError("Patient record not found.", 404, "NOT_FOUND");
  }

  // Only execute update and audit log if the photo URL actually changed
  if (patient.photoUrl !== photoUrl) {
    await prisma.patient.update({
      where: { id },
      data: { photoUrl },
    });

    await logAdminAction({
      action: "PATIENT_PHOTO_UPDATED",
      resource: "Patient",
      entityId: id,
      previousState: { photoUrl: patient.photoUrl },
      newState: { photoUrl },
      description: `Updated profile photo reference for patient ${patient.name} (UHID ${patient.uhid}).`,
    });
  }

  return { message: "Patient photo updated successfully.", photoUrl };
});
