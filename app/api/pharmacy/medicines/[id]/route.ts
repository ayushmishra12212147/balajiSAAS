import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { MedicineMasterSchema } from "@/modules/pharmacy/schemas";
import { PharmacyService } from "@/modules/pharmacy/services/pharmacy-service";

/**
 * PATCH /api/pharmacy/medicines/[id]
 * Updates medicine card parameters or disabled toggles in database.
 */
export const PATCH = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Pharmacy", "Purchase");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  const validated = ValidationService.validate(MedicineMasterSchema, body);

  const updated = await PharmacyService.updateMedicine(
    id,
    validated,
    reqContext.employee.id
  );

  return updated;
});
