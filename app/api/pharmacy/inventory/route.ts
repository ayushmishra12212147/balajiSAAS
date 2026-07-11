import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * GET /api/pharmacy/inventory
 * Optimized inventory listing that returns summary data only.
 * Avoids unnecessary joins for general dashboards.
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Pharmacy", "View");

  const searchParams = req.nextUrl.searchParams;
  const name = searchParams.get("name") || "";
  const category = searchParams.get("category") || "";

  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || "10")));
  const skip = (page - 1) * limit;

  // Filter conditions
  const whereMedicine: Prisma.MedicineWhereInput = { isDeleted: false };
  if (name.trim()) {
    whereMedicine.OR = [
      { name: { contains: name.trim(), mode: "insensitive" } },
      { genericName: { contains: name.trim(), mode: "insensitive" } },
    ];
  }
  if (category.trim()) {
    whereMedicine.category = { equals: category.trim() };
  }

  // Count total matches
  const total = await prisma.medicine.count({ where: whereMedicine });

  // Select summary metadata only
  const medicinesSummary = await prisma.medicine.findMany({
    where: whereMedicine,
    skip,
    take: limit,
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      genericName: true,
      category: true,
      brand: true,
      unit: true,
      minimumStock: true,
      isActive: true,
      sellingPrice: true,
      purchasePrice: true,
      stock: {
        where: { isDeleted: false },
        select: {
          currentQuantity: true,
        },
      },
    },
  });

  // Map to aggregated inventory totals
  const inventory = medicinesSummary.map((med) => {
    const currentStock = med.stock.reduce((sum, item) => sum + item.currentQuantity, 0);
    return {
      id: med.id,
      code: med.code,
      name: med.name,
      genericName: med.genericName,
      category: med.category,
      brand: med.brand,
      unit: med.unit,
      minimumStock: med.minimumStock,
      isActive: med.isActive,
      sellingPrice: med.sellingPrice,
      purchasePrice: med.purchasePrice,
      currentStock,
      isLowStock: currentStock < med.minimumStock,
    };
  });

  return {
    inventory,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
});
