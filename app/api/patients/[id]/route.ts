import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { PatientFormSchema } from "@/modules/patients/schemas";
import { PatientService } from "@/modules/patients/services/patient-service";

/**
 * GET /api/patients/[id]
 * Retrieves the complete profile details for a patient.
 */
export const GET = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Patient", "View");

  const { id } = await (context.params as Promise<{ id: string }>);

  const patient = await prisma.patient.findUnique({
    where: { id, isDeleted: false },
    include: {
      address: {
        where: { isDeleted: false },
      },
      emergencyContact: {
        where: { isDeleted: false },
      },
      referrals: {
        where: { isDeleted: false },
      },
    },
  });

  if (!patient) {
    throw new AppError("Patient record not found.", 404, "NOT_FOUND");
  }

  const previousEncountersCount = await prisma.oPDConsultation.count({
    where: { patientId: id, isDeleted: false },
  });

  return {
    ...patient,
    isRevisit: previousEncountersCount > 0,
  };
});

/**
 * PUT /api/patients/[id]
 * Applies demographic edits. Enforces optimistic lock checks and edit duplicate warning blocks.
 */
export const PUT = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Patient", "Edit");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  const version = Number(body.version);
  if (isNaN(version)) {
    throw new AppError("A valid version code is required for optimistic locking verification.", 400, "BAD_REQUEST");
  }

  const validated = ValidationService.validate(PatientFormSchema, body);

  const result = await PatientService.updatePatient(
    id,
    version,
    validated,
    reqContext.employee.id
  );

  return result;
});
