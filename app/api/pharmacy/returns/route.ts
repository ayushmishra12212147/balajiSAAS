import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { SalesReturnSchema } from "@/modules/pharmacy/schemas";
import { PharmacyService } from "@/modules/pharmacy/services/pharmacy-service";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * GET /api/pharmacy/returns
 * Lists paginated sales returns.
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Pharmacy", "View");

  const searchParams = req.nextUrl.searchParams;
  const returnNumber = searchParams.get("returnNumber") || "";

  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || "10")));
  const skip = (page - 1) * limit;

  const where: Prisma.PharmacyReturnWhereInput = {
    isDeleted: false,
  };

  if (returnNumber.trim()) {
    where.returnNumber = { contains: returnNumber.trim(), mode: "insensitive" };
  }

  const total = await prisma.pharmacyReturn.count({ where });

  const returns = await prisma.pharmacyReturn.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      pharmacyInvoice: {
        select: {
          pharmacyInvoiceNumber: true,
          customerName: true,
        },
      },
      items: {
        include: {
          medicine: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      },
    },
  });

  return {
    returns,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
});

/**
 * POST /api/pharmacy/returns
 * Records a new sales return.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Pharmacy", "Return");

  const body = await req.json();
  const validated = ValidationService.validate(SalesReturnSchema, body);

  const salesReturn = await PharmacyService.processReturn(
    validated,
    context.employee.id
  );

  return salesReturn;
});
