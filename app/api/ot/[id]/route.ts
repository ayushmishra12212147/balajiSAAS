import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { OTRevisionSchema } from "@/modules/ot/schemas";
import { OTService } from "@/modules/ot/services/ot-service";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";

/**
 * GET /api/ot/[id]
 * Returns full details for a single Operation Theatre booking, including revisions.
 */
export const GET = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "OT", "View");

  const { id } = await (context.params as Promise<{ id: string }>);

  const ot = await prisma.operationTheater.findUnique({
    where: { id, isDeleted: false },
    include: {
      patient: {
        include: {
          address: true,
        },
      },
      department: true,
      procedureCatalog: true,
      primarySurgeon: {
        include: { employee: true },
      },
      assistantSurgeon: {
        include: { employee: true },
      },
      revisions: {
        orderBy: { revisionNumber: "desc" },
      },
    },
  });

  if (!ot) {
    throw new AppError("Operation booking record not found.", 404, "NOT_FOUND");
  }

  // Retrieve assigned billable charges
  const charges = await prisma.billableCharge.findMany({
    where: {
      sourceModule: "OT",
      sourceEntityId: id,
      isDeleted: false,
    },
    include: {
      chargeCatalog: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    ...ot,
    charges,
  };
});

/**
 * PATCH /api/ot/[id]
 * Edits details of a completed OT, storing the previous state inside OperationTheaterRevision.
 */
export const PATCH = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "OT", "Register");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  const validated = ValidationService.validate(OTRevisionSchema, body);

  const updated = await OTService.editCompletedOT(
    id,
    validated,
    reqContext.employee.id
  );

  return updated;
});
