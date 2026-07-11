import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { StockAdjustmentSchema } from "@/modules/pharmacy/schemas";
import { PharmacyService } from "@/modules/pharmacy/services/pharmacy-service";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * GET /api/pharmacy/adjustments
 * Lists stock adjustments logs.
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Pharmacy", "View");

  const searchParams = req.nextUrl.searchParams;
  const batchNumber = searchParams.get("batchNumber") || "";

  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || "10")));
  const skip = (page - 1) * limit;

  const where: Prisma.PharmacyStockAdjustmentWhereInput = {};

  if (batchNumber.trim()) {
    where.batchNumber = { contains: batchNumber.trim(), mode: "insensitive" };
  }

  const total = await prisma.pharmacyStockAdjustment.count({ where });

  const adjustments = await prisma.pharmacyStockAdjustment.findMany({
    where,
    skip,
    take: limit,
    orderBy: { date: "desc" },
    include: {
      medicine: {
        select: {
          name: true,
          code: true,
        },
      },
      employee: {
        select: {
          employeeCode: true,
          designation: true,
        },
      },
    },
  });

  return {
    adjustments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
});

/**
 * POST /api/pharmacy/adjustments
 * Records a new stock adjustment.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Pharmacy", "Stock Adjustment");

  const body = await req.json();
  const validated = ValidationService.validate(StockAdjustmentSchema, body);

  const adjustment = await PharmacyService.adjustStock(
    validated,
    context.employee.id
  );

  return adjustment;
});
