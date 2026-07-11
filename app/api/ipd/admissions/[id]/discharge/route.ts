import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { DischargeSchema } from "@/modules/ipd/schemas";
import { IPDService } from "@/modules/ipd/services/ipd-service";

/**
 * POST /api/ipd/admissions/[id]/discharge
 * Finalizes patient clinical discharges, releasing beds and checking diagnostic/OT gates.
 */
export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "Discharge");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  const validated = ValidationService.validate(DischargeSchema, body);

  const updatedAdmission = await IPDService.dischargePatient(
    id,
    validated,
    reqContext.employee.id
  );

  return updatedAdmission;
});
