import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";

/**
 * GET /api/pharmacy/sales/[id]
 * Retrieves detailed sales invoice details.
 */
export const GET = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Pharmacy", "View");

  const { id } = await (context.params as Promise<{ id: string }>);

  const invoice = await prisma.pharmacyInvoice.findUnique({
    where: { id, isDeleted: false },
    include: {
      recipient: {
        select: {
          employeeCode: true,
          designation: true,
        },
      },
      items: {
        include: {
          medicine: true,
        },
      },
      payments: true,
      returns: {
        where: { isDeleted: false },
        include: {
          items: {
            include: {
              medicine: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    throw new AppError("Sales invoice record not found.", 404, "NOT_FOUND");
  }

  return invoice;
});
