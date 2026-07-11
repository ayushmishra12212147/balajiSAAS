import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { OTChargeAssignmentSchema } from "@/modules/ot/schemas";
import { OTService } from "@/modules/ot/services/ot-service";

/**
 * POST /api/ot/[id]/assign-charge
 * Assigns clinical or procedure charges to the surgical ledger (surgeon, anesthesia, consumable fees).
 */
export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "OT", "Assign Charges");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  const validated = ValidationService.validate(OTChargeAssignmentSchema, body);

  const charge = await OTService.assignCharge(
    id,
    validated,
    reqContext.employee.id
  );

  return charge;
});
