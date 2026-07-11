import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { DiagnosticsService } from "@/modules/diagnostics/services/diagnostics-service";

/**
 * GET /api/radiology/orders/[id]
 * Returns full details, findings, and snapshot revision records for a single Radiology Scan Order.
 */
export const GET = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Radiology", "View");

  const { id } = await (context.params as Promise<{ id: string }>);

  const order = await prisma.radiologyScanOrder.findUnique({
    where: { id, isDeleted: false },
    include: {
      patient: {
        select: {
          id: true,
          uhid: true,
          name: true,
          gender: true,
          dob: true,
          phone: true,
        },
      },
      scanCatalog: true,
      orderedByDoctor: {
        select: {
          employee: {
            select: {
              designation: true,
            },
          },
        },
      },
      revisions: {
        orderBy: { revisionNumber: "desc" },
      },
    },
  });

  if (!order) {
    throw new AppError("Radiology scan order not found.", 404, "NOT_FOUND");
  }

  // Load technician and verifier designations if set
  let technicianDesignation = "";
  let verifiedByDesignation = "";

  if (order.technicianId) {
    const tech = await prisma.employee.findUnique({ where: { id: order.technicianId } });
    technicianDesignation = tech?.designation || "";
  }
  if (order.verifiedById) {
    const ver = await prisma.employee.findUnique({ where: { id: order.verifiedById } });
    verifiedByDesignation = ver?.designation || "";
  }

  // Calculate payment clearance status
  let isPaid = false;
  if (order.billableChargeId) {
    isPaid = await DiagnosticsService.isChargePaid(order.billableChargeId);
  }

  return {
    ...order,
    technicianDesignation,
    verifiedByDesignation,
    isPaid,
  };
});
