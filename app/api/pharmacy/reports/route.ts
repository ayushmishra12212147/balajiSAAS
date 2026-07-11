
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/pharmacy/reports
 * Compiles dashboard metrics, revenue reports, and low-stock items alerts.
 */
export const GET = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Pharmacy", "View");

  // 1. Calculate total pharmacy sales revenue
  const salesAgg = await prisma.pharmacyInvoice.aggregate({
    where: { isDeleted: false, status: "PAID" },
    _sum: {
      payableAmount: true,
    },
  });
  const totalRevenue = Number(salesAgg._sum.payableAmount || 0);

  // 2. Calculate stock adjustments totals
  const totalAdjustmentsCount = await prisma.pharmacyStockAdjustment.count();

  // 3. Resolve Low Stock List (currentStock < minimumStock)
  const medicines = await prisma.medicine.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      code: true,
      name: true,
      minimumStock: true,
      stock: {
        where: { isDeleted: false },
        select: {
          currentQuantity: true,
        },
      },
    },
  });

  const lowStockList = medicines
    .map((med) => {
      const currentStock = med.stock.reduce((sum, item) => sum + item.currentQuantity, 0);
      return {
        id: med.id,
        code: med.code,
        name: med.name,
        minimumStock: med.minimumStock,
        currentStock,
      };
    })
    .filter((med) => med.currentStock < med.minimumStock);

  return {
    totalRevenue,
    totalAdjustmentsCount,
    lowStockList,
  };
});
