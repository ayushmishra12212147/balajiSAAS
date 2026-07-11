import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { ChargeAssignmentSchema } from "@/modules/ipd/schemas";
import { IPDService } from "@/modules/ipd/services/ipd-service";

/**
 * POST /api/ipd/admissions/[id]/assign-charge
 * Assigns clinical or procedure charges to the inpatient's ledger.
 */
export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "Assign Charges");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();

  if (Array.isArray(body)) {
    const results = [];
    for (const item of body) {
      const validated = ValidationService.validate(ChargeAssignmentSchema, item);
      const charge = await IPDService.assignCharge(
        id,
        validated,
        reqContext.employee.id
      );
      results.push(charge);
    }
    return results;
  } else {
    const validated = ValidationService.validate(ChargeAssignmentSchema, body);
    const charge = await IPDService.assignCharge(
      id,
      validated,
      reqContext.employee.id
    );
    return charge;
  }
});
