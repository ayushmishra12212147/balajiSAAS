import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ipd/charge-catalogs
 * Retrieves clinical and procedure charge catalogs for IPD allocation.
 * Filters out "Laboratory" and "Radiology" to prevent test details from showing up in IPD charges ledger.
 * Auto-seeds standard entries if the catalog is empty.
 */
export const GET = wrapAuthRoute(async () => {
  let chargeCatalogs = await prisma.chargeCatalog.findMany({
    where: {
      isDeleted: false,
      category: {
        notIn: ["Laboratory", "Radiology", "LABORATORY", "RADIOLOGY", "OPD", "opd", "Admission", "admission"],
      },
    },
    orderBy: { name: "asc" },
  });

  if (chargeCatalogs.length === 0) {
    // Auto-seed standard clinical procedure and ward charges
    await prisma.chargeCatalog.createMany({
      data: [
        { code: "IPD_ICU_RENT", name: "ICU Ward Rent (Per Day)", category: "Ward Rent", rate: 5000.00 },
        { code: "IPD_GEN_RENT", name: "General Ward Rent (Per Day)", category: "Ward Rent", rate: 1000.00 },
        { code: "PROC_IV_DRIP", name: "Intravenous Infusion Setup", category: "Procedure", rate: 250.00 },
        { code: "PROC_DRESSING", name: "Wound Dressing (Standard)", category: "Procedure", rate: 150.00 },
        { code: "PROC_OXYGEN", name: "Oxygen Administration (Per Hour)", category: "Procedure", rate: 100.00 },
        { code: "PROC_NEBULIZATION", name: "Nebulization Session", category: "Procedure", rate: 200.00 },
      ],
    });
    
    chargeCatalogs = await prisma.chargeCatalog.findMany({
      where: {
        isDeleted: false,
        category: {
          notIn: ["Laboratory", "Radiology", "LABORATORY", "RADIOLOGY"],
        },
      },
      orderBy: { name: "asc" },
    });
  }

  return chargeCatalogs;
});
