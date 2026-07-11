import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";

/**
 * GET /api/billing/invoices/[id]
 * Retrieves invoice profiles, payments breakdowns, deposits allocations, and billable charges.
 */
export const GET = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Billing", "View");

  const { id } = await (context.params as Promise<{ id: string }>);

  const invoice = await prisma.invoice.findUnique({
    where: { id, isDeleted: false },
    include: {
      patient: {
        select: {
          id: true,
          uhid: true,
          name: true,
          phone: true,
          gender: true,
          dob: true,
        },
      },
      canceller: {
        select: {
          employeeCode: true,
          designation: true,
        },
      },
      payments: {
        where: { isDeleted: false },
        orderBy: { receivedAt: "desc" },
        include: {
          recipient: {
            select: {
              employeeCode: true,
              designation: true,
            },
          },
        },
      },
      refunds: {
        where: { isDeleted: false },
        orderBy: { refundedAt: "desc" },
        include: {
          manager: {
            select: {
              employeeCode: true,
              designation: true,
            },
          },
        },
      },
      depositAllocations: {
        where: { isDeleted: false },
        include: {
          deposit: true,
        },
      },
      charges: {
        where: { isDeleted: false },
        include: {
          billableCharge: {
            include: {
              chargeCatalog: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    throw new AppError("Invoice record not found.", 404, "NOT_FOUND");
  }

  return invoice;
});
