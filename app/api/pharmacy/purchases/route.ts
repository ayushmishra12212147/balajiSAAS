import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { PurchaseEntrySchema } from "@/modules/pharmacy/schemas";
import { PharmacyService } from "@/modules/pharmacy/services/pharmacy-service";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * GET /api/pharmacy/purchases
 * Lists paginated supplier purchase orders.
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Pharmacy", "View");

  const searchParams = req.nextUrl.searchParams;
  const invoiceNumber = searchParams.get("invoiceNumber") || "";
  const supplierName = searchParams.get("supplierName") || "";

  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || "10")));
  const skip = (page - 1) * limit;

  const where: Prisma.PharmacyPurchaseOrderWhereInput = {
    isDeleted: false,
  };

  if (invoiceNumber.trim()) {
    where.invoiceNumber = { contains: invoiceNumber.trim(), mode: "insensitive" };
  }
  if (supplierName.trim()) {
    where.supplierName = { contains: supplierName.trim(), mode: "insensitive" };
  }

  const total = await prisma.pharmacyPurchaseOrder.count({ where });

  const purchases = await prisma.pharmacyPurchaseOrder.findMany({
    where,
    skip,
    take: limit,
    orderBy: { orderDate: "desc" },
    include: {
      recipient: {
        select: {
          employeeCode: true,
          designation: true,
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
    purchases,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
});

/**
 * POST /api/pharmacy/purchases
 * Registers a new purchase booking order.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Pharmacy", "Purchase");

  const body = await req.json();
  const validated = ValidationService.validate(PurchaseEntrySchema, body);

  const purchase = await PharmacyService.recordPurchase(
    validated,
    context.employee.id
  );

  return purchase;
});
