import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { ChargeCatalogFormSchema } from "@/modules/admin/schemas";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { AppError } from "@/server/errors";

/**
 * GET /api/admin/charge-catalogs
 * Lists all charge catalogs (including soft-deleted ones).
 */
export const GET = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageSettings");

  const catalogs = await prisma.chargeCatalog.findMany({
    orderBy: [
      { category: "asc" },
      { name: "asc" },
    ],
  });

  return catalogs;
});

/**
 * POST /api/admin/charge-catalogs
 * Provisions a new clinical procedure or ward charge catalog entry.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageSettings");

  const body = await req.json();
  const validated = ValidationService.validate(ChargeCatalogFormSchema, body);

  // Check unique code
  const existingCode = await prisma.chargeCatalog.findUnique({
    where: { code: validated.code },
  });

  if (existingCode) {
    throw new AppError(
      `A charge catalog entry with code '${validated.code}' already exists.`,
      400,
      "BAD_REQUEST"
    );
  }

  const catalog = await prisma.chargeCatalog.create({
    data: {
      code: validated.code,
      name: validated.name,
      category: validated.category,
      rate: validated.rate,
      otType: validated.otType || null,
      isDeleted: false,
    },
  });

  await logAdminAction({
    action: "CHARGE_CATALOG_CREATE",
    resource: "ChargeCatalog",
    entityId: catalog.id,
    newState: catalog,
    description: `Created charge catalog ${catalog.name} (${catalog.code}) at ₹${catalog.rate}`,
  });

  return catalog;
});
