import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { DeathRegistrationSchema } from "@/modules/ipd/schemas";
import { IPDService } from "@/modules/ipd/services/ipd-service";

/**
 * POST /api/ipd/admissions/[id]/death
 * Registers deceased inpatient clinically under active IPD, closing bed allocation.
 */
export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "Register Death");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  const validated = ValidationService.validate(DeathRegistrationSchema, body);

  const death = await IPDService.registerDeath(
    id,
    validated,
    reqContext.employee.id
  );

  return death;
});
