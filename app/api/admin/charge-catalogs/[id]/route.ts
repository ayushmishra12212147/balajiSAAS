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
 * PUT /api/admin/charge-catalogs/[id]
 * Updates clinical charge catalog configurations.
 */
export const PUT = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Admin", "ManageSettings");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  const validated = ValidationService.validate(ChargeCatalogFormSchema, body);

  const before = await prisma.chargeCatalog.findUnique({
    where: { id },
  });

  if (!before) {
    throw new AppError("Charge catalog record not found", 404, "NOT_FOUND");
  }

  // Check code unique constraint if updated
  if (validated.code !== before.code) {
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
  }

  const updated = await prisma.chargeCatalog.update({
    where: { id },
    data: {
      code: validated.code,
      name: validated.name,
      category: validated.category,
      rate: validated.rate,
      otType: validated.otType !== undefined ? validated.otType : before.otType,
      isDeleted: validated.isDeleted ?? before.isDeleted,
    },
  });

  await logAdminAction({
    action: "CHARGE_CATALOG_UPDATE",
    resource: "ChargeCatalog",
    entityId: id,
    previousState: before,
    newState: updated,
    description: `Updated charge catalog ${updated.name} (${updated.code}). Rate: ₹${updated.rate}. Status: ${
      updated.isDeleted ? "Disabled" : "Enabled"
    }`,
  });

  return updated;
});
