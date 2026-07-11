import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";

/**
 * GET /api/pharmacy/inventory/batches
 * Returns active batches of a medicine sorted by earliest expiry date (FEFO suggestion).
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Pharmacy", "View");

  const searchParams = req.nextUrl.searchParams;
  const medicineId = searchParams.get("medicineId");

  if (!medicineId) {
    throw new AppError("Medicine identifier parameter is required.", 400, "BAD_REQUEST");
  }

  // Retrieve active stock batches.
  // Order by expiryDate ASC to recommend FEFO batches first. Null expiry dates are sorted last.
  const batches = await prisma.medicineStock.findMany({
    where: {
      medicineId,
      isDeleted: false,
    },
    orderBy: [
      {
        expiryDate: {
          sort: "asc" as const,
          nulls: "last" as const,
        },
      },
    ],
  });

  return batches;
});
