import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/opd/catalogs
 * Retrieves laboratory and radiology test catalogs for physician assignments.
 * Auto-seeds standard entries if the catalog is empty.
 */
export const GET = wrapAuthRoute(async () => {
  let labCatalogs = await prisma.labTestCatalog.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  if (labCatalogs.length === 0) {
    // Auto-seed lab catalogs for demonstration
    await prisma.labTestCatalog.createMany({
      data: [
        { code: "LAB_CBC", name: "Complete Blood Count (CBC)", category: "Hematology", standardRate: 350.0 },
        { code: "LAB_LIPID", name: "Lipid Profile", category: "Biochemistry", standardRate: 850.0 },
        { code: "LAB_LFT", name: "Liver Function Test (LFT)", category: "Biochemistry", standardRate: 750.0 },
        { code: "LAB_KFT", name: "Kidney Function Test (KFT)", category: "Biochemistry", standardRate: 700.0 },
        { code: "LAB_TSH", name: "Thyroid Stimulating Hormone (TSH)", category: "Endocrinology", standardRate: 500.0 },
      ],
    });
    labCatalogs = await prisma.labTestCatalog.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
    });
  }

  let radCatalogs = await prisma.radiologyScanCatalog.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  if (radCatalogs.length === 0) {
    // Auto-seed radiology catalogs for demonstration
    await prisma.radiologyScanCatalog.createMany({
      data: [
        { code: "RAD_XRAY_CHEST", name: "X-Ray Chest PA View", category: "X-Ray", standardRate: 450.0 },
        { code: "RAD_USG_ABD", name: "USG Whole Abdomen", category: "Ultrasound", standardRate: 1500.0 },
        { code: "RAD_CT_BRAIN", name: "CT Brain Plain", category: "CT Scan", standardRate: 3500.0 },
        { code: "RAD_MRI_SPINE", name: "MRI Lumbar Spine", category: "MRI Scan", standardRate: 7500.0 },
      ],
    });
    radCatalogs = await prisma.radiologyScanCatalog.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
    });
  }

  return {
    labCatalogs,
    radCatalogs,
  };
});
