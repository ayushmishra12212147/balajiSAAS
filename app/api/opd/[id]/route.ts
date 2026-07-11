import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";

/**
 * GET /api/opd/[id]
 * Extracts the complete outpatient visit profile, charges, deposits, and orders.
 */
export const GET = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "OPD", "View");

  const { id } = await (context.params as Promise<{ id: string }>);

  const encounter = await prisma.oPDConsultation.findUnique({
    where: { id, isDeleted: false },
    include: {
      patient: {
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
      },
      doctor: {
        select: {
          id: true,
          roomNumber: true,
          employee: {
            select: {
              name: true,
              designation: true,
            },
          },
        },
      },
      department: {
        select: {
          id: true,
          name: true,
        },
      },
      canceller: {
        select: {
          employeeCode: true,
          designation: true,
        },
      },
      deposits: {
        where: { isDeleted: false },
      },
      labOrders: {
        where: { isDeleted: false },
        include: {
          testCatalog: true,
        },
      },
      radiologyOrders: {
        where: { isDeleted: false },
        include: {
          scanCatalog: true,
        },
      },
    },
  });

  if (!encounter) {
    throw new AppError("OPD consultation record not found.", 404, "NOT_FOUND");
  }

  // Load associated BillableCharges
  const charges = await prisma.billableCharge.findMany({
    where: {
      OR: [
        { sourceModule: "OPD", sourceEntityId: id },
        { sourceModule: "LABORATORY", sourceEntityId: { in: encounter.labOrders.map(o => o.id) } },
        { sourceModule: "RADIOLOGY", sourceEntityId: { in: encounter.radiologyOrders.map(o => o.id) } },
      ],
      isDeleted: false,
    },
    include: {
      chargeCatalog: {
        select: {
          name: true,
          code: true,
          category: true,
        },
      },
    },
  });

  return {
    ...encounter,
    charges,
  };
});

/**
 * PATCH /api/opd/[id]
 * Updates consulting doctor, department, or symptoms of the visit within a 3-hour window.
 */
export const PATCH = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "OPD", "Edit");

  const { id } = await (context.params as Promise<{ id: string }>);
  const body = await req.json();

  const encounter = await prisma.oPDConsultation.findUnique({
    where: { id, isDeleted: false },
  });

  if (!encounter) {
    throw new AppError("OPD consultation record not found.", 450, "NOT_FOUND");
  }

  // Enforce 3-hour limit
  const threeHoursInMs = 3 * 60 * 60 * 1000;
  const elapsed = Date.now() - encounter.createdAt.getTime();
  if (elapsed > threeHoursInMs) {
    throw new AppError(
      "Editing window expired. Visits can only be edited within 3 hours of registration.",
      400,
      "EDITING_EXPIRED"
    );
  }

  const updated = await prisma.oPDConsultation.update({
    where: { id },
    data: {
      doctorId: body.doctorId || undefined,
      departmentId: body.departmentId || undefined,
      symptoms: body.symptoms !== undefined ? body.symptoms : undefined,
      updatedBy: reqContext.employee.id,
    },
  });

  return updated;
});
