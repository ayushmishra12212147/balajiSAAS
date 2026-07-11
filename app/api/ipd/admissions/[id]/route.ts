import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { DischargeSchema } from "@/modules/ipd/schemas";
import { IPDService } from "@/modules/ipd/services/ipd-service";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";

/**
 * GET /api/ipd/admissions/[id]
 * Returns full detailed profile for a single IPD admission, including transfers, doctor assignments, and revisions.
 */
export const GET = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "View");

  const { id } = await (context.params as Promise<{ id: string }>);

  const admission = await prisma.iPDAdmission.findUnique({
    where: { id, isDeleted: false },
    include: {
      patient: {
        include: {
          address: true,
          emergencyContact: true,
        },
      },
      bed: {
        include: {
          room: true,
        },
      },
      primaryDoctor: {
        include: {
          employee: true,
        },
      },
      department: true,
      referredByDoctor: {
        include: {
          employee: true,
        },
      },
      doctorAssignments: {
        where: { isDeleted: false },
        orderBy: { effectiveFrom: "desc" },
        include: {
          previousDoctor: { include: { employee: true } },
          assignedDoctor: { include: { employee: true } },
          changedByEmployee: true,
        },
      },
      bedTransfers: {
        where: { isDeleted: false },
        orderBy: { transferDate: "desc" },
        include: {
          previousBed: { include: { room: true } },
          newBed: { include: { room: true } },
          manager: true,
        },
      },
      dischargeSummaryRevisions: {
        orderBy: { revisionNumber: "desc" },
      },
      births: {
        where: { isDeleted: false },
      },
      deaths: {
        where: { isDeleted: false },
      },
      attendants: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
      },
      timelineEvents: {
        orderBy: { createdAt: "desc" },
      },
      vitals: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
      },
      rounds: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        include: {
          doctor: { include: { employee: true } },
        },
      },
      progressNotes: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
      },
      treatmentOrders: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
      },
      intakeOutputs: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
      },
      consultations: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        include: {
          targetDepartment: true,
          targetDoctor: { include: { employee: true } },
        },
      },
      handovers: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        include: {
          recipientUser: true,
        },
      },
      nursingTasks: {
        where: { isDeleted: false },
        orderBy: { scheduledTime: "desc" },
      },
      attachments: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!admission) {
    throw new AppError("Inpatient admission record not found.", 404, "NOT_FOUND");
  }

  // Retrieve assigned billable charges
  const charges = await prisma.billableCharge.findMany({
    where: {
      sourceModule: "IPD",
      sourceEntityId: id,
      isDeleted: false,
    },
    include: {
      chargeCatalog: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    ...admission,
    charges,
  };
});

/**
 * PATCH /api/ipd/admissions/[id]
 * Updates admission fields (like codeStatus, isolationStatus) or discharge summary.
 */
export const PATCH = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "View");

  const { id } = await (context.params as Promise<{ id: string }>);
  const body = await req.json();

  // If header actions update codeStatus or isolationStatus
  if (body.codeStatus !== undefined || body.isolationStatus !== undefined) {
    const updated = await prisma.iPDAdmission.update({
      where: { id },
      data: {
        codeStatus: body.codeStatus,
        isolationStatus: body.isolationStatus,
      },
    });
    return updated;
  }

  // Otherwise treat as editing discharge summary
  await requirePermission(reqContext.employee.id, "IPD", "Discharge");
  const validated = ValidationService.validate(DischargeSchema, body);
  const updated = await IPDService.updateDischargeSummary(
    id,
    validated.dischargeSummary,
    reqContext.employee.id
  );
  return updated;
});
