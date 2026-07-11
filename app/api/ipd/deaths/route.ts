import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { DeathRegistrationSchema } from "@/modules/ipd/schemas";
import { IPDService } from "@/modules/ipd/services/ipd-service";

/**
 * POST /api/ipd/deaths
 * Registers an emergency or brought-dead deceased record not associated with any active inpatient admission.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "Register Death");

  const body = await req.json();
  const validated = ValidationService.validate(DeathRegistrationSchema, body);

  const death = await IPDService.registerDeath(
    null, // No active IPD admission link
    validated,
    reqContext.employee.id
  );

  return death;
});
